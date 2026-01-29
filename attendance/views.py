from django.shortcuts import get_object_or_404
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth import authenticate, logout
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.views import APIView
import csv
from openpyxl import Workbook
from django.utils.dateparse import parse_date
from collections import defaultdict
import io
import base64
import random
import string
import qrcode
import threading
try:
    import requests
except Exception:
    requests = None
from .throttles import AttendanceTokenBurstThrottle
from .analytics_utils import (
    get_attendance_statistics,
    get_top_courses,
    get_attendance_trends,
    get_student_participation,
    get_lecturer_activity,
    get_system_overview
)

from django.conf import settings
from .models import Lecturer, Student, Course, CourseEnrollment, Attendance, AttendanceToken, Feedback
from .serializers import (
    LecturerSerializer,
    StudentSerializer,
    CourseSerializer,
    AttendanceSerializer,
    AttendanceTokenSerializer,
    LogoutSerializer,
    SubmitLocationSerializer,
    FeedbackSerializer,
)
from rest_framework.permissions import AllowAny, IsAdminUser
from .validators import get_password_requirements
from .models import EmailVerificationToken, PasswordResetToken
from .email_utils import send_verification_email, send_password_reset_email, send_attendance_notification
from .report_utils import generate_attendance_pdf, generate_attendance_excel
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from datetime import datetime

# Current user profile info
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = 'admin' if user.is_staff or user.is_superuser else 'user'
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'student_id': None,
            'lecturer_id': None,
            'organization': None
        }
        
        if hasattr(user, 'student'):
            data['role'] = 'student'
            data['student_id'] = user.student.student_id
            data['phone_number'] = user.student.phone_number
            if user.student.organization:
                data['organization'] = {'id': user.student.organization.id, 'name': user.student.organization.name}
            # Mock preferences for now or pull from model if added
            data['notification_preferences'] = {} 

        if hasattr(user, 'lecturer'):
            data['role'] = 'lecturer'
            data['lecturer_id'] = user.lecturer.staff_id
            data['phone_number'] = user.lecturer.phone_number
            if user.lecturer.organization:
                data['organization'] = {'id': user.lecturer.organization.id, 'name': user.lecturer.organization.name}
            data['notification_preferences'] = {}

        return Response(data)

    def patch(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        
        # Update User fields
        if 'email' in data: user.email = data['email']
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        user.save()

        # Update Role fields
        if hasattr(user, 'student'):
            student = user.student
            if 'phone_number' in data:
                student.phone_number = data['phone_number']
            student.save()
        
        elif hasattr(user, 'lecturer'):
            lecturer = user.lecturer
            if 'phone_number' in data:
                lecturer.phone_number = data['phone_number']
            lecturer.save()
            
        return self.get(request)


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving organizations.
    Read-only for regular users, writable through admin panel.
    """
    queryset = Lecturer.objects.none()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import Organization
        # Get organizations the user has access to
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Organization.objects.filter(is_active=True)
        
        # For students and lecturers, return their organization
        org_ids = []
        if hasattr(user, 'student') and user.student.organization:
            org_ids.append(user.student.organization.id)
        if hasattr(user, 'lecturer') and user.lecturer.organization:
            org_ids.append(user.lecturer.organization.id)
        
        return Organization.objects.filter(id__in=org_ids, is_active=True)

    def get_serializer_class(self):
        from .serializers import OrganizationSerializer
        return OrganizationSerializer


class PasswordRequirementsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response(get_password_requirements())


# Lecturer ViewSet
class LecturerViewSet(viewsets.ModelViewSet):
    queryset = Lecturer.objects.all()
    serializer_class = LecturerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='my-courses')
    def my_courses(self, request):
        lecturer = get_object_or_404(Lecturer, user=request.user)
        courses = Course.objects.filter(lecturer=lecturer)
        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data)

# Student ViewSet
class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

# Course ViewSet
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'lecturer'):
            serializer.save(lecturer=user.lecturer, organization=user.lecturer.organization)
        elif hasattr(user, 'student'):
             # Students shouldn't create courses, but just in case
             serializer.save(organization=user.student.organization)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], throttle_classes=[AttendanceTokenBurstThrottle])
    def generate_attendance_token(self, request, pk=None):
        course = self.get_object()
        token_value = request.data.get('token')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if not token_value:
             # Auto-generate if not provided
             token_value = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        # Create the attendance token
        token = AttendanceToken.objects.create(
            course=course,
            token=token_value,
            generated_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(hours=4),
            is_active=True
        )

        # Optionally update the lecturer's location if provided
        if latitude and longitude:
            lecturer = course.lecturer
            lecturer.latitude = latitude
            lecturer.longitude = longitude
            lecturer.save()

        serializer = AttendanceTokenSerializer(token)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch_upload(self, request):
        """
        Batch upload courses from CSV file.
        Expected CSV format: course_code,name,lecturer_staff_id
        """
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            success_count = 0
            error_count = 0
            errors = []
            
            for row in reader:
                try:
                    course_code = row.get('course_code', '').strip()
                    name = row.get('name', '').strip()
                    lecturer_staff_id = row.get('lecturer_staff_id', '').strip()
                    
                    if not course_code or not name:
                        error_count += 1
                        errors.append(f"Row missing course_code or name")
                        continue
                    
                    # Find lecturer
                    lecturer = None
                    if lecturer_staff_id:
                        try:
                            lecturer = Lecturer.objects.get(staff_id=lecturer_staff_id)
                        except Lecturer.DoesNotExist:
                            error_count += 1
                            errors.append(f"Lecturer {lecturer_staff_id} not found")
                            continue
                    
                    # Create or update course
                    course, created = Course.objects.update_or_create(
                        course_code=course_code,
                        defaults={
                            'name': name,
                            'lecturer': lecturer,
                        }
                    )
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    errors.append(str(e))
            
            return Response({
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors[:10]  # Return first 10 errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='generate_attendance_qr', throttle_classes=[AttendanceTokenBurstThrottle])
    def generate_attendance_qr(self, request, pk=None):
        """Generate an attendance token (if not provided) and return a QR PNG with the token encoded.
        - Only the lecturer assigned to the course can generate tokens.
        - If 'as=base64' in request data or format=json requested, returns JSON with base64 data URL.
        - Validates token uniqueness and format when provided.
        """
        course = self.get_object()

        # Permission check: only lecturer assigned to the course
        if not hasattr(request.user, 'lecturer') or request.user.lecturer != course.lecturer:
            return Response({'error': 'Permission denied. Only the course lecturer may generate QR tokens.'}, status=status.HTTP_403_FORBIDDEN)

        token_value = request.data.get('token')

        # Validate provided token
        if token_value:
            token_value = str(token_value).strip().upper()
            if AttendanceToken.objects.filter(token=token_value).exists():
                return Response({'error': 'Token already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            if not token_value.isalnum() or len(token_value) > 12:
                return Response({'error': 'Invalid token format. Use alphanumeric up to 12 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Generate a random 6-character alphanumeric token
            token_value = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            # Ensure uniqueness
            while AttendanceToken.objects.filter(token=token_value).exists():
                token_value = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        token_obj = AttendanceToken.objects.create(
            course=course,
            token=token_value,
            generated_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(hours=4),
            is_active=True
        )

        # Optionally update lecturer location
        lecturer = course.lecturer
        if latitude and longitude:
            try:
                lecturer.latitude = float(latitude)
                lecturer.longitude = float(longitude)
                lecturer.save()
            except (ValueError, TypeError):
                pass

        # Create PNG
        qr = qrcode.QRCode(box_size=10, border=2)
        qr.add_data(token_obj.token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        data = buf.getvalue()

        # Return base64 data URL if requested or Accept: application/json
        as_format = request.data.get('as') or request.query_params.get('format')
        accept = request.headers.get('Accept', '')
        if as_format == 'base64' or 'application/json' in accept or request.content_type == 'application/json':
            b64 = base64.b64encode(data).decode('ascii')
            return Response({'token': token_obj.token, 'qr_base64': f'data:image/png;base64,{b64}'}, status=status.HTTP_200_OK)

        return HttpResponse(data, content_type='image/png')

    @action(detail=False, methods=['post'])
    def enroll(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Course code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Flexible matching for demo ease
            course = Course.objects.get(course_code__iexact=code.strip())
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Use get_or_create for M2M with through model
        enrollment, created = CourseEnrollment.objects.get_or_create(course=course, student=student)
        
        if not created:
             return Response({'message': f'Already enrolled in {course.name}'}, status=status.HTTP_200_OK)
             
        return Response({'message': f'Successfully enrolled in {course.name}'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def take_attendance(self, request):
        token = request.data.get('token')

        if not token:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            attendance_token = AttendanceToken.objects.get(token=token, is_active=True)
            
            if attendance_token.expires_at and attendance_token.expires_at <= timezone.now():
                attendance_token.is_active = False
                attendance_token.save()
                return Response({'error': 'Token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

            course = attendance_token.course
            student = get_object_or_404(Student, user=request.user)

            if student not in course.students.all():
                return Response({'error': 'Student is not enrolled in this course.'}, status=status.HTTP_400_BAD_REQUEST)

            attendance, created = Attendance.objects.get_or_create(
                course=course,
                date=timezone.now().date()
            )
            attendance.present_students.add(student)
            attendance.save()
            
            # Send notification to student
            try:
                send_attendance_notification(student, course, course.lecturer)
            except Exception as e:
                # Don't fail attendance if notification fails
                print(f"Failed to send notification: {e}")

            return Response({'message': 'Attendance recorded successfully.'}, status=status.HTTP_200_OK)

        except AttendanceToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        
# Attendance ViewSet
class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def generate_excel(self, request):
        attendance_id = request.query_params.get('attendance_id')

        if not attendance_id:
            return Response({'error': 'attendance_id parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        attendance = get_object_or_404(Attendance, id=attendance_id)

        # Create an Excel workbook and add a worksheet
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Attendance Report"

        # Add header row
        worksheet.append(['Student ID', 'Student Name', 'Date of Attendance', 'Status'])

        # Collect present students
        present_students = [(student.student_id, student.name) for student in attendance.present_students.all()]

        # Collect missed students
        course_students = list(attendance.course.students.all())
        missed_students = [(student.student_id, student.name) for student in course_students if student not in attendance.present_students.all()]

        # Write present students
        for student_id, student_name in sorted(present_students):
            worksheet.append([student_id, student_name, attendance.date, 'Present'])

        # Write absent students
        for student_id, student_name in sorted(missed_students):
            worksheet.append([student_id, student_name, attendance.date, 'Absent'])

        # Create an HTTP response with the Excel file
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="attendance_{attendance_id}.xlsx"'

        workbook.save(response)
        return response

    @action(detail=False, methods=['post'], url_path='end_attendance')
    def end_attendance(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'error': 'course_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Retrieve the most recent attendance for the course
            attendance = Attendance.objects.filter(course_id=course_id, is_active=True).latest('date')
        except Attendance.DoesNotExist:
            return Response({'error': 'No active attendance found for the course.'}, status=status.HTTP_404_NOT_FOUND)

        attendance.is_active = False
        attendance.ended_at = timezone.now()
        attendance.save()
        return Response({'status': 'Attendance session ended successfully'}, status=status.HTTP_200_OK)
    

# AttendanceToken ViewSet
class AttendanceTokenViewSet(viewsets.ModelViewSet):
    queryset = AttendanceToken.objects.all()
    serializer_class = AttendanceTokenSerializer
    permission_classes = [IsAuthenticated]


class FeedbackViewSet(viewsets.ModelViewSet):
    """Create feedback (anyone) and list recent feedback (admin only)."""
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    throttle_classes = []  # set per-action

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAdminUser(), IsAuthenticated()]
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser(), IsAuthenticated()]

    def get_throttles(self):
        # Apply feedback throttle only for create
        if self.action == 'create':
            from .throttles import FeedbackRateThrottle
            return [FeedbackRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        feedback = serializer.save(user=user)

        # Send webhook in background (best-effort, non-blocking) with signing and retries
        webhook_url = getattr(settings, 'FEEDBACK_WEBHOOK_URL', None)
        webhook_secret = getattr(settings, 'FEEDBACK_WEBHOOK_SECRET', None)
        if webhook_url and requests is not None:
            # minimal payload; avoid PII
            payload = {
                'rating': feedback.rating,
                'comment': feedback.comment,
                'user_id': feedback.user.id if feedback.user else None,
                'created_at': feedback.created_at.isoformat()
            }

            def _send_with_retries(p, url, secret, attempts=3):
                import hmac
                import hashlib
                import time
                headers = {'Content-Type': 'application/json'}
                body = p
                # If secret is provided, add HMAC signature header to authenticate webhook receivers
                if secret:
                    try:
                        msg = (p['created_at'] + str(p['rating']) + (p.get('comment') or '')).encode('utf-8')
                        sig = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
                        headers['X-Feedback-Signature'] = sig
                    except Exception:
                        pass

                for i in range(attempts):
                    try:
                        resp = requests.post(url, json=body, headers=headers, timeout=3)
                        if resp.status_code < 400:
                            return True
                    except Exception as exc:
                        # log and continue retrying
                        try:
                            import sentry_sdk
                            sentry_sdk.capture_exception(exc)
                        except Exception:
                            pass
                    time.sleep(1 * (2 ** i))
                # final failure logged to sentry if available
                try:
                    import sentry_sdk
                    sentry_sdk.capture_message('Feedback webhook failed after retries', level='error')
                except Exception:
                    pass
                return False

            t = threading.Thread(target=_send_with_retries, args=(payload, webhook_url, webhook_secret), daemon=True)
            t.start()

# Student Enrolled Courses View
class StudentEnrolledCoursesView(generics.ListAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        student = get_object_or_404(Student, user=user)
        return Course.objects.filter(students=student)

# Custom Login Views
class StudentLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        student_id = request.data.get('student_id')

        user = authenticate(request, username=username, password=password)
        if user and hasattr(user, 'student'):
            student = user.student

            if student.student_id == student_id:
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'user_id': user.student.id,
                    'username': user.username,
                    'student_id': student.student_id
                })
            else:
                return Response({'error': 'Invalid student ID'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

class StaffLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        staff_id = request.data.get('staff_id')

        user = authenticate(request, username=username, password=password)
        if user and hasattr(user, 'lecturer'):
            lecturer = user.lecturer
            if lecturer.staff_id == staff_id:
                token, created = Token.objects.get_or_create(user=user)

                return Response({
                    'token': token.key,
                    'user_id': user.lecturer.id,
                    'username': user.username,
                    'staff_id': lecturer.staff_id
                })
            else:
                return Response({'error': 'Invalid staff ID'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

# Logout View
class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        request.user.auth_token.delete()
        logout(request)
        return Response(status=status.HTTP_200_OK)

# Location-based Attendance View
class SubmitLocationView(generics.GenericAPIView):
    serializer_class = SubmitLocationSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        accuracy = request.data.get('accuracy')  # GPS accuracy in meters
        attendance_token = request.data.get('attendance_token')

        # Validate inputs
        if not latitude or not longitude:
            return Response({
                'error': 'Latitude and longitude are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            latitude = float(latitude)
            longitude = float(longitude)
            accuracy = float(accuracy) if accuracy else None
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid location coordinates'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate token
        try:
            token = AttendanceToken.objects.get(token=attendance_token, is_active=True)
        except AttendanceToken.DoesNotExist:
            return Response({
                'error': 'Invalid or expired attendance token'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get active attendance session
        attendance = Attendance.objects.filter(
            course=token.course, 
            date=timezone.now().date(),
            is_active=True
        ).first()

        if not attendance:
            return Response({
                'error': 'No active attendance session for this course'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify user is a student
        user = request.user
        if not hasattr(user, 'student'):
            return Response({
                'error': 'Only students can mark attendance'
            }, status=status.HTTP_403_FORBIDDEN)

        student = user.student

        # Verify student is enrolled in course
        if student not in token.course.students.all():
            return Response({
                'error': 'Student not enrolled in this course'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if already marked present
        if student in attendance.present_students.all():
            return Response({
                'message': 'Attendance already marked',
                'status': 'already_present'
            }, status=status.HTTP_200_OK)

        # Verify location is within radius
        if not attendance.is_within_radius(latitude, longitude, accuracy):
            location_info = attendance.get_location_info(latitude, longitude)
            return Response({
                'error': 'Location is out of range',
                'location_info': location_info
            }, status=status.HTTP_400_BAD_REQUEST)

        # Mark attendance
        attendance.present_students.add(student)
        attendance.save()

        # Get location info for response
        location_info = attendance.get_location_info(latitude, longitude)

        # Send notification (async if Celery is available)
        try:
            from .tasks import send_attendance_notification_async
            send_attendance_notification_async.delay(
                student.name,
                token.course.name,
                user.email,
                student.phone_number
            )
        except Exception:
            # Fallback to synchronous notification
            from .email_utils import send_attendance_notification
            send_attendance_notification(student, token.course)

        return Response({
            'status': 'success',
            'message': 'Attendance marked successfully',
            'location_info': location_info
        }, status=status.HTTP_200_OK)

# Student Attendance History View
from rest_framework.response import Response

class StudentAttendanceHistoryView(generics.GenericAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Fetch the current user and the corresponding student object
        user = self.request.user
        student = get_object_or_404(Student, user=user)

        # Retrieve attendance records where the student was present
        attendance_records = Attendance.objects.filter(
            present_students=student
        ).order_by('-date')

        # Categorize records by course code and order by date descending within each course
        categorized_records = defaultdict(list)
        for attendance in attendance_records:
            course_code = attendance.course.course_code
            categorized_records[course_code].append({
                'date': attendance.date.strftime('%Y-%m-%d'),
            })

        # Prepare the response data
        response_data = [{'course_code': course, 'attendances': records} for course, records in categorized_records.items()]

        return Response(response_data)
    
#Lecturer Attendance History View
class LecturerAttendanceHistoryView(generics.GenericAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Fetch the current user and the corresponding lecturer object
        user = self.request.user
        lecturer = get_object_or_404(Lecturer, user=user)

        # Retrieve attendance records for courses taught by the lecturer
        attendance_records = Attendance.objects.filter(
            course__lecturer=lecturer
        ).order_by('-date')

        # Categorize records by course code and order by date descending within each course
        categorized_records = defaultdict(list)
        for attendance in attendance_records:
            course_code = attendance.course.course_code
            categorized_records[course_code].append({
                'date': attendance.date.strftime('%Y-%m-%d'),
            })

        # Prepare the response data
        response_data = [{'course_code': course, 'attendances': records} for course, records in categorized_records.items()]

        return Response(response_data)
# Lecturer Location View
class LecturerLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        token_value = request.data.get('token')

        try:
            token = AttendanceToken.objects.get(token=token_value, is_active=True)
            lecturer = token.course.lecturer

            if lecturer.latitude is None or lecturer.longitude is None:
                return Response({'error': 'Lecturer coordinates not set.'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'longitude': lecturer.longitude,
                'latitude': lecturer.latitude,
                'token': token.token
            }, status=status.HTTP_200_OK)

        except AttendanceToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

# Admin-only creation and bulk import
class AdminCreateStudentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        data = request.data
        username = data.get('username')
        password = data.get('password') or 'changeme123'
        student_id = data.get('student_id')
        name = data.get('name')
        programme = data.get('programme_of_study')
        year = data.get('year')
        phone = data.get('phone_number')

        if not username or not student_id or not name:
            return Response({'error': 'username, student_id, and name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if Student.objects.filter(student_id=student_id).exists():
            return Response({'error': 'Student ID already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        student = Student.objects.create(
            user=user,
            student_id=student_id,
            name=name,
            programme_of_study=programme,
            year=year,
            phone_number=phone,
        )
        return Response({'id': student.id, 'username': user.username, 'student_id': student.student_id}, status=status.HTTP_201_CREATED)


class AdminCreateLecturerView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        data = request.data
        username = data.get('username')
        password = data.get('password') or 'changeme123'
        staff_id = data.get('staff_id')
        name = data.get('name')
        department = data.get('department')
        phone = data.get('phone_number')

        if not username or not staff_id or not name:
            return Response({'error': 'username, staff_id, and name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if Lecturer.objects.filter(staff_id=staff_id).exists():
            return Response({'error': 'Staff ID already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        lecturer = Lecturer.objects.create(
            user=user,
            staff_id=staff_id,
            name=name,
            department=department,
            phone_number=phone,
        )
        return Response({'id': lecturer.id, 'username': user.username, 'staff_id': lecturer.staff_id}, status=status.HTTP_201_CREATED)


class AdminBulkImportStudentsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = upload.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'File must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded))
        
        # Validate required columns
        required_columns = ['username', 'student_id', 'name']
        if not reader.fieldnames:
            return Response({'error': 'CSV file is empty or malformed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        missing_columns = [col for col in required_columns if col not in reader.fieldnames]
        if missing_columns:
            return Response({
                'error': f'Missing required columns: {", ".join(missing_columns)}',
                'required': required_columns,
                'found': reader.fieldnames
            }, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        skipped = 0
        errors = []
        
        for idx, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
            username = (row.get('username') or '').strip()
            password = (row.get('password') or 'changeme123').strip()
            student_id = (row.get('student_id') or '').strip()
            name = (row.get('name') or '').strip()
            programme = (row.get('programme_of_study') or '').strip()
            year = (row.get('year') or '').strip()
            phone = (row.get('phone_number') or '').strip()

            # Validation
            if not username or not student_id or not name:
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': 'Missing required fields (username, student_id, or name)'
                })
                skipped += 1
                continue

            # Check for duplicates
            if User.objects.filter(username=username).exists():
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': f'Username "{username}" already exists'
                })
                skipped += 1
                continue
            
            if Student.objects.filter(student_id=student_id).exists():
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': f'Student ID "{student_id}" already exists'
                })
                skipped += 1
                continue

            # Validate year if provided
            if year and not year.isdigit():
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': f'Invalid year "{year}" - must be a number'
                })
                skipped += 1
                continue

            try:
                user = User.objects.create_user(username=username, password=password)
                Student.objects.create(
                    user=user,
                    student_id=student_id,
                    name=name,
                    programme_of_study=programme,
                    year=int(year) if year else None,
                    phone_number=phone,
                )
                created += 1
            except Exception as e:
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': str(e)
                })
                skipped += 1

        return Response({
            'created': created,
            'skipped': skipped,
            'errors': errors[:50],  # Limit to first 50 errors
            'total_errors': len(errors)
        }, status=status.HTTP_200_OK)


class AdminBulkImportLecturersView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = upload.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'File must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded))
        
        # Validate required columns
        required_columns = ['username', 'staff_id', 'name']
        if not reader.fieldnames:
            return Response({'error': 'CSV file is empty or malformed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        missing_columns = [col for col in required_columns if col not in reader.fieldnames]
        if missing_columns:
            return Response({
                'error': f'Missing required columns: {", ".join(missing_columns)}',
                'required': required_columns,
                'found': reader.fieldnames
            }, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        skipped = 0
        errors = []
        
        for idx, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
            username = (row.get('username') or '').strip()
            password = (row.get('password') or 'changeme123').strip()
            staff_id = (row.get('staff_id') or '').strip()
            name = (row.get('name') or '').strip()
            department = (row.get('department') or '').strip()
            phone = (row.get('phone_number') or '').strip()

            # Validation
            if not username or not staff_id or not name:
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': 'Missing required fields (username, staff_id, or name)'
                })
                skipped += 1
                continue

            # Check for duplicates
            if User.objects.filter(username=username).exists():
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': f'Username "{username}" already exists'
                })
                skipped += 1
                continue
            
            if Lecturer.objects.filter(staff_id=staff_id).exists():
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': f'Staff ID "{staff_id}" already exists'
                })
                skipped += 1
                continue

            try:
                user = User.objects.create_user(username=username, password=password)
                Lecturer.objects.create(
                    user=user,
                    staff_id=staff_id,
                    name=name,
                    department=department,
                    phone_number=phone,
                )
                created += 1
            except Exception as e:
                errors.append({
                    'row': idx,
                    'data': row,
                    'error': str(e)
                })
                skipped += 1

        return Response({
            'created': created,
            'skipped': skipped,
            'errors': errors[:50],  # Limit to first 50 errors
            'total_errors': len(errors)
        }, status=status.HTTP_200_OK)


class AdminAssignLecturerView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        lecturer_id = request.data.get('lecturer_id')
        if not course_id or not lecturer_id:
            return Response({'error': 'course_id and lecturer_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        course = get_object_or_404(Course, id=course_id)
        lecturer = get_object_or_404(Lecturer, id=lecturer_id)
        course.lecturer = lecturer
        course.save()
        return Response({'status': 'lecturer_assigned', 'course_id': course.id, 'lecturer_id': lecturer.id})


class AdminEnrollStudentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        student_id = request.data.get('student_id')
        if not course_id or not student_id:
            return Response({'error': 'course_id and student_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        course = get_object_or_404(Course, id=course_id)
        student = get_object_or_404(Student, id=student_id)

        # Use through model to ensure enrollment exists
        CourseEnrollment.objects.get_or_create(course=course, student=student)
        return Response({'status': 'student_enrolled', 'course_id': course.id, 'student_id': student.id})


class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            send_password_reset_email(user)
            return Response({'message': 'Password reset link sent to your email'})
        except User.DoesNotExist:
            # Don't reveal if user exists
            return Response({'message': 'If an account exists with this email, you will receive a password reset link'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token_value = request.data.get('token')
        new_password = request.data.get('password')
        
        if not token_value or not new_password:
            return Response({'error': 'Token and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token = PasswordResetToken.objects.get(token=token_value)
            
            if not token.is_valid():
                return Response({'error': 'Token is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate password strength
            try:
                validate_password(new_password, token.user)
            except DjangoValidationError as e:
                return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            token.user.set_password(new_password)
            token.user.save()
            
            # Mark token as used
            token.used = True
            token.save()
            
            return Response({'message': 'Password reset successfully'})
            
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token_value = request.data.get('token')
        
        if not token_value:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token = EmailVerificationToken.objects.get(token=token_value)
            
            if not token.is_valid():
                return Response({'error': 'Token is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark email as verified (you can add a field to User model)
            user = token.user
            # For now, we'll just delete the token to indicate verification
            token.delete()
            
            return Response({'message': 'Email verified successfully', 'username': user.username})
            
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class AttendanceReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get query parameters
        format_type = request.query_params.get('format', 'pdf')  # pdf or excel
        course_id = request.query_params.get('course_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        student_id = request.query_params.get('student_id')
        
        # Base queryset
        attendances = Attendance.objects.all().select_related('student', 'course', 'course__lecturer')
        
        # Apply filters
        if course_id:
            attendances = attendances.filter(course_id=course_id)
        if student_id:
            attendances = attendances.filter(student_id=student_id)
        if start_date:
            attendances = attendances.filter(date__gte=start_date)
        if end_date:
            attendances = attendances.filter(date__lte=end_date)
        
        # Order by date
        attendances = attendances.order_by('-date')
        
        # Get course if specified
        course = None
        if course_id:
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                pass
        
        # Generate date range string
        date_range = None
        if start_date and end_date:
            date_range = f"{start_date} to {end_date}"
        elif start_date:
            date_range = f"From {start_date}"
        elif end_date:
            date_range = f"Until {end_date}"
        
        # Generate report based on format
        if format_type == 'excel':
            buffer = generate_attendance_excel(attendances, course, date_range)
            filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        else:  # Default to PDF
            buffer = generate_attendance_pdf(attendances, course, date_range)
            filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Get query parameters
        days = int(request.query_params.get('days', 30))
        
        # Gather all analytics data
        analytics_data = {
            'system_overview': get_system_overview(),
            'attendance_statistics': get_attendance_statistics(days=days),
            'top_courses': get_top_courses(limit=10),
            'attendance_trends': get_attendance_trends(days=days),
            'student_participation': get_student_participation(),
            'lecturer_activity': get_lecturer_activity(limit=10)
        }
        
        return Response(analytics_data)

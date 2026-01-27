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

from django.conf import settings
from .models import Lecturer, Student, Course, Attendance, AttendanceToken, Feedback
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
            'role': role,
            'student_id': None,
            'lecturer_id': None,
        }
        if hasattr(user, 'student'):
            data['role'] = 'student'
            data['student_id'] = user.student.id
        if hasattr(user, 'lecturer'):
            data['role'] = 'lecturer'
            data['lecturer_id'] = user.lecturer.id
        return Response(data)

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

    @action(detail=True, methods=['post'], throttle_classes=[AttendanceTokenBurstThrottle])
    def generate_attendance_token(self, request, pk=None):
        course = self.get_object()
        token_value = request.data.get('token')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if not token_value or not latitude or not longitude:
            return Response({'error': 'Token, latitude, and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the attendance token
        token = AttendanceToken.objects.create(
            course=course,
            token=token_value,
            generated_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(hours=4),
            is_active=True
        )

        # Optionally update the lecturer's location
        lecturer = course.lecturer
        lecturer.latitude = latitude
        lecturer.longitude = longitude
        lecturer.save()

        serializer = AttendanceTokenSerializer(token)
        return Response(serializer.data)

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
    def take_attendance(self, request):
        token = request.data.get('token')

        if not token:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            attendance_token = AttendanceToken.objects.get(token=token, is_active=True)
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
        attendance_token = request.data.get('attendance_token')

        try:
            token = AttendanceToken.objects.get(token=attendance_token, is_active=True)
        except AttendanceToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

        attendance = Attendance.objects.filter(course=token.course, date=timezone.now().date()).first()

        if attendance and attendance.is_within_radius(float(latitude), float(longitude)):
            user = request.user
            if hasattr(user, 'student'):
                student = user.student
                if student in token.course.students.all():
                    attendance.present_students.add(student)
                    attendance.save()
                    return Response({'status': 'Attendance marked successfully'}, status=status.HTTP_200_OK)
            return Response({'error': 'Student not enrolled in this course'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'Location is out of range'}, status=status.HTTP_400_BAD_REQUEST)

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

        decoded = upload.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        created = 0
        skipped = 0
        for row in reader:
            username = (row.get('username') or '').strip()
            password = (row.get('password') or 'changeme123').strip()
            student_id = (row.get('student_id') or '').strip()
            name = (row.get('name') or '').strip()
            programme = (row.get('programme_of_study') or '').strip()
            year = (row.get('year') or '').strip()
            phone = (row.get('phone_number') or '').strip()

            if not username or not student_id or not name:
                skipped += 1
                continue
            if User.objects.filter(username=username).exists() or Student.objects.filter(student_id=student_id).exists():
                skipped += 1
                continue

            user = User.objects.create_user(username=username, password=password)
            Student.objects.create(
                user=user,
                student_id=student_id,
                name=name,
                programme_of_study=programme,
                year=year,
                phone_number=phone,
            )
            created += 1

        return Response({'created': created, 'skipped': skipped}, status=status.HTTP_200_OK)


class AdminBulkImportLecturersView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        decoded = upload.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        created = 0
        skipped = 0
        for row in reader:
            username = (row.get('username') or '').strip()
            password = (row.get('password') or 'changeme123').strip()
            staff_id = (row.get('staff_id') or '').strip()
            name = (row.get('name') or '').strip()
            department = (row.get('department') or '').strip()
            phone = (row.get('phone_number') or '').strip()

            if not username or not staff_id or not name:
                skipped += 1
                continue
            if User.objects.filter(username=username).exists() or Lecturer.objects.filter(staff_id=staff_id).exists():
                skipped += 1
                continue

            user = User.objects.create_user(username=username, password=password)
            Lecturer.objects.create(
                user=user,
                staff_id=staff_id,
                name=name,
                department=department,
                phone_number=phone,
            )
            created += 1

        return Response({'created': created, 'skipped': skipped}, status=status.HTTP_200_OK)

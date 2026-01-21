from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import Student, Lecturer, Course, Attendance, AttendanceToken
from django.utils import timezone


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create student user
        self.student_user = User.objects.create_user(username='student1', password='pass123')
        self.student = Student.objects.create(user=self.student_user, student_id='S1001', name='Student One')
        # Create lecturer user
        self.lecturer_user = User.objects.create_user(username='lect1', password='pass123')
        self.lecturer = Lecturer.objects.create(user=self.lecturer_user, staff_id='L1001', name='Lecturer One')
        # Create a course and enroll student
        self.course = Course.objects.create(name='Math', course_code='MATH101', lecturer=self.lecturer)
        self.course.students.add(self.student)

    def test_student_login_returns_token(self):
        url = '/api/api/login/student/'
        resp = self.client.post(url, {'username': 'student1', 'password': 'pass123', 'student_id': 'S1001'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.data)

    def test_staff_login_returns_token(self):
        url = '/api/api/login/staff/'
        resp = self.client.post(url, {'username': 'lect1', 'password': 'pass123', 'staff_id': 'L1001'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.data)


class AttendanceFlowTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # Clear global throttle state so each test runs deterministically

        self.client = APIClient()
        # Create users
        self.student_user = User.objects.create_user(username='student2', password='pass123')
        self.student = Student.objects.create(user=self.student_user, student_id='S2001', name='Student Two')
        self.lecturer_user = User.objects.create_user(username='lect2', password='pass123')
        self.lecturer = Lecturer.objects.create(user=self.lecturer_user, staff_id='L2001', name='Lecturer Two', latitude=1.0, longitude=1.0)
        # Create course and enroll
        self.course = Course.objects.create(name='Physics', course_code='PHY101', lecturer=self.lecturer)
        self.course.students.add(self.student)
        # Obtain lecturer token
        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        self.lect_token = lect_resp.data.get('token')
        # Lecturer generates attendance token
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.lect_token)
        gen_resp = self.client.post(f'/api/courses/{self.course.id}/generate_attendance_token/', {'token': 'ABC123', 'latitude': '1.0', 'longitude': '1.0'}, format='json')
        self.assertEqual(gen_resp.status_code, 200)
        self.attendance_token = gen_resp.data.get('token')

    def test_generate_attendance_qr_returns_png(self):
        # Lecturer logs in and requests QR PNG
        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        lect_token = lect_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + lect_token)
        # Request QR generation without specifying token value (non-JSON POST to get PNG)
        resp = self.client.post(f'/api/courses/{self.course.id}/generate_attendance_qr/', {'latitude': '1.0', 'longitude': '1.0'})
        self.assertEqual(resp.status_code, 200)
        # Content-Type may include charset; check it starts with image/png
        self.assertTrue(resp['Content-Type'].startswith('image/png'))
        self.assertTrue(resp.content.startswith(b'\x89PNG'))

    def test_generate_attendance_qr_base64_json(self):
        # Lecturer requests base64 JSON response
        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        lect_token = lect_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + lect_token)
        resp = self.client.post(f'/api/courses/{self.course.id}/generate_attendance_qr/', {'latitude': '1.0', 'longitude': '1.0', 'as': 'base64'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('qr_base64', resp.data)
        self.assertTrue(resp.data['qr_base64'].startswith('data:image/png;base64,'))

    def test_generate_attendance_qr_permission_denied_for_student(self):
        # Student should not be able to generate QR
        stud_resp = self.client.post('/api/api/login/student/', {'username': 'student2', 'password': 'pass123', 'student_id': 'S2001'}, format='json')
        stud_token = stud_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + stud_token)
        resp = self.client.post(f'/api/courses/{self.course.id}/generate_attendance_qr/', {'latitude': '1.0', 'longitude': '1.0'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_generate_attendance_token_conflict(self):
        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        lect_token = lect_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + lect_token)
        # Try to create a token that already exists
        resp = self.client.post(f'/api/courses/{self.course.id}/generate_attendance_qr/', {'token': 'ABC123', 'latitude': '1.0', 'longitude': '1.0'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_rate_limit_on_qr_generation(self):
        # Ensure per-user rate limit (3/min) applies
        from django.core.cache import cache
        cache.clear()  # Reset throttle counters for deterministic test

        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        lect_token = lect_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + lect_token)
        url = f'/api/courses/{self.course.id}/generate_attendance_qr/'
        # First 3 requests should succeed
        for i in range(3):
            resp = self.client.post(url, {'as': 'base64'}, format='json')
            self.assertEqual(resp.status_code, 200)
        # 4th request should be throttled
        resp = self.client.post(url, {'as': 'base64'}, format='json')
        self.assertEqual(resp.status_code, 429)

    def test_rate_limit_on_token_generation(self):
        from django.core.cache import cache
        cache.clear()

        lect_resp = self.client.post('/api/api/login/staff/', {'username': 'lect2', 'password': 'pass123', 'staff_id': 'L2001'}, format='json')
        lect_token = lect_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + lect_token)
        url = f'/api/courses/{self.course.id}/generate_attendance_token/'
        for i in range(3):
            resp = self.client.post(url, {'token': f'A{i}B{i}C{i}', 'latitude': '1.0', 'longitude': '1.0'}, format='json')
            self.assertEqual(resp.status_code, 200)
        resp = self.client.post(url, {'token': 'ZZZZZZ', 'latitude': '1.0', 'longitude': '1.0'}, format='json')
        self.assertEqual(resp.status_code, 429)


    def test_student_can_take_attendance_with_token(self):
        # Student logs in
        stud_resp = self.client.post('/api/api/login/student/', {'username': 'student2', 'password': 'pass123', 'student_id': 'S2001'}, format='json')
        stud_token = stud_resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + stud_token)
        take_resp = self.client.post('/api/courses/take_attendance/', {'token': 'ABC123'}, format='json')
        self.assertEqual(take_resp.status_code, 200)
        self.assertIn('message', take_resp.data)
        # Confirm Attendance created
        attendance = Attendance.objects.filter(course=self.course, date=timezone.now().date()).first()
        self.assertIsNotNone(attendance)
        self.assertIn(self.student, attendance.present_students.all())


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_healthz_endpoint_reports_ok(self):
        resp = self.client.get('/api/healthz/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('status', resp.json())
        self.assertEqual(resp.json().get('status'), 'ok')
        self.assertEqual(resp.json().get('db'), 'ok')


class FeedbackTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()

    def test_post_feedback_anonymous(self):
        resp = self.client.post('/api/feedback/', {'rating': 5, 'comment': 'Great app!'}, format='json')
        self.assertEqual(resp.status_code, 201)
        from .models import Feedback
        self.assertEqual(Feedback.objects.count(), 1)
        fb = Feedback.objects.first()
        self.assertEqual(fb.rating, 5)
        self.assertEqual(fb.comment, 'Great app!')

    def test_webhook_called_when_enabled(self):
        from django.test.utils import override_settings
        import time
        with override_settings(FEEDBACK_WEBHOOK_URL='https://hooks.example.test/'):  # set webhook
            from unittest.mock import patch, Mock
            with patch('attendance.views.requests') as mock_requests:
                mock_requests.post = Mock()
                resp = self.client.post('/api/feedback/', {'rating': 4, 'comment': 'Nice'}, format='json')
                self.assertEqual(resp.status_code, 201)
                # webhook is sent in background thread; wait briefly
                time.sleep(0.1)
                self.assertTrue(mock_requests.post.called)
                call_args = mock_requests.post.call_args[1] if mock_requests.post.call_args else {}
                self.assertIn('json', call_args)
                self.assertEqual(call_args['json']['rating'], 4)

    def test_webhook_signed_when_secret_set(self):
        from django.test.utils import override_settings
        import time
        with override_settings(FEEDBACK_WEBHOOK_URL='https://hooks.example.test/', FEEDBACK_WEBHOOK_SECRET='shhh'):
            from unittest.mock import patch, Mock
            with patch('attendance.views.requests') as mock_requests:
                mock_requests.post = Mock()
                resp = self.client.post('/api/feedback/', {'rating': 3, 'comment': 'Okay'}, format='json')
                self.assertEqual(resp.status_code, 201)
                time.sleep(0.1)
                # ensure header was sent
                call_kwargs = mock_requests.post.call_args[1] if mock_requests.post.call_args else {}
                headers = call_kwargs.get('headers', {})
                self.assertIn('X-Feedback-Signature', headers)

    def test_feedback_comment_length_validation(self):
        long_comment = 'a' * 2000
        resp = self.client.post('/api/feedback/', {'rating': 5, 'comment': long_comment}, format='json')
        # Serializer truncates to 1000, so should still accept
        self.assertEqual(resp.status_code, 201)
        from .models import Feedback
        self.assertEqual(Feedback.objects.first().comment, 'a' * 1000)

    def test_feedback_throttling(self):
        from django.core.cache import cache
        cache.clear()
        # Submit more than allowed per hour (limit 10/hour). We'll loop 12 times and expect some 429 responses
        results = []
        for i in range(12):
            resp = self.client.post('/api/feedback/', {'rating': 4, 'comment': f'c{i}'}, format='json')
            results.append(resp.status_code)
        self.assertTrue(429 in results)

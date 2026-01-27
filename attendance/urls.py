from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views
from .health import HealthCheckView

router = DefaultRouter()
router.register(r'lecturers', views.LecturerViewSet, basename='lecturer')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'attendances', views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-tokens', views.AttendanceTokenViewSet, basename='attendance-token')
router.register(r'feedback', views.FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', views.MeView.as_view(), name='me'),
    path('admin/create-student/', views.AdminCreateStudentView.as_view(), name='admin_create_student'),
    path('admin/create-lecturer/', views.AdminCreateLecturerView.as_view(), name='admin_create_lecturer'),
    path('admin/import-students/', views.AdminBulkImportStudentsView.as_view(), name='admin_import_students'),
    path('admin/import-lecturers/', views.AdminBulkImportLecturersView.as_view(), name='admin_import_lecturers'),
    path('admin/assign-lecturer/', views.AdminAssignLecturerView.as_view(), name='admin_assign_lecturer'),
    path('admin/enroll-student/', views.AdminEnrollStudentView.as_view(), name='admin_enroll_student'),
    path('api/studentenrolledcourses/', views.StudentEnrolledCoursesView.as_view(), name='student_enrolled_courses'),
    path('api/login/student/', views.StudentLoginView.as_view(), name='student_login'),
    path('api/login/staff/', views.StaffLoginView.as_view(), name='staff_login'),
    path('api/logout/', views.LogoutView.as_view(), name='api_logout'),
    path('api/submit-location/', views.SubmitLocationView.as_view(), name='submit_location'),
    path('api/student-attendance-history/', views.StudentAttendanceHistoryView.as_view(), name='student_attendance_history'),
    path('api/lecturer-attendance-history/', views.LecturerAttendanceHistoryView.as_view(), name='lecturer_attendance_history'),
    path('api/lecturer-location/', views.LecturerLocationView.as_view(), name='lecturer_location'),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    # Health check endpoint (public)
    path('healthz/', HealthCheckView.as_view(), name='health_check'),
]

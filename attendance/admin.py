from django.contrib import admin
from .models import (
    Organization, Lecturer, Student, Course, CourseEnrollment, Attendance, 
    AttendanceToken, Feedback, EmailVerificationToken, PasswordResetToken
)

admin.site.register(Organization)
admin.site.register(Course)
admin.site.register(Attendance)
admin.site.register(Student)
admin.site.register(Lecturer)
admin.site.register(CourseEnrollment)
admin.site.register(AttendanceToken)
admin.site.register(Feedback)
admin.site.register(EmailVerificationToken)
admin.site.register(PasswordResetToken)

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import Lecturer, Student, Course, CourseEnrollment

class Command(BaseCommand):
    help = 'Seeds the database with demo accounts for testing'

    def handle(self, *args, **options):
        # 1. Create Demo Lecturer
        lect_user, created = User.objects.get_or_create(username='demo_lecturer', defaults={'email': 'lecturer@demo.com'})
        if created:
            lect_user.set_password('demo123')
            lect_user.first_name = 'Demo'
            lect_user.last_name = 'Lecturer'
            lect_user.save()
            Lecturer.objects.create(user=lect_user, staff_id='L9999', name='Demo Lecturer')
            self.stdout.write(self.style.SUCCESS(f'Created Lecturer: demo_lecturer / demo123'))
        else:
             self.stdout.write('Lecturer already exists')

        # 2. Create Demo Student
        stud_user, created = User.objects.get_or_create(username='demo_student', defaults={'email': 'student@demo.com'})
        if created:
            stud_user.set_password('demo123')
            stud_user.first_name = 'Demo'
            stud_user.last_name = 'Student'
            stud_user.save()
            Student.objects.create(user=stud_user, student_id='S9999', name='Demo Student')
            self.stdout.write(self.style.SUCCESS(f'Created Student: demo_student / demo123'))
        else:
             self.stdout.write('Student already exists')

        # 3. Create Demo Course
        lecturer = Lecturer.objects.get(user__username='demo_lecturer')
        course, created = Course.objects.get_or_create(
            course_code='DEMO101',
            defaults={
                'name': 'Introduction to Demo Systems',
                'lecturer': lecturer
            }
        )
        if created:
             self.stdout.write(self.style.SUCCESS('Created Course: DEMO101'))

        # 4. Enroll Student
        student = Student.objects.get(user__username='demo_student')
        if not CourseEnrollment.objects.filter(student=student, course=course).exists():
            CourseEnrollment.objects.create(student=student, course=course)
            self.stdout.write(self.style.SUCCESS('Enrolled Demo Student in DEMO101'))

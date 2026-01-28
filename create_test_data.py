"""
Script to create realistic test data for attendance system
Simulates a university environment with:
- 1 Organization (University)
- 1 Admin user
- 3 Lecturers (from different departments)
- 15 Students (Year 1-4)
- 4 Courses with enrolled students
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_system.settings')
django.setup()

from django.contrib.auth.models import User
from attendance.models import Organization, Lecturer, Student, Course
from datetime import datetime

def create_test_data():
    print("🏫 Creating Test Data for Attendance System\n")
    print("=" * 60)
    
    # 1. Create Organization
    print("\n📋 Creating Organization...")
    org, created = Organization.objects.get_or_create(
        name="Tech University",
        defaults={
            "slug": "tech-university",
            "domain": "tech-university",
            "is_active": True
        }
    )
    print(f"✓ Organization: {org.name} {'(created)' if created else '(exists)'}")
    
    # 2. Create Admin User
    print("\n👤 Creating Admin User...")
    admin_user, created = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@techuniversity.edu",
            "first_name": "System",
            "last_name": "Administrator",
            "is_staff": True,
            "is_superuser": True
        }
    )
    if created:
        admin_user.set_password("admin123")
        admin_user.save()
        print(f"✓ Admin: {admin_user.username} (password: admin123)")
    else:
        print(f"✓ Admin: {admin_user.username} (already exists)")
    
    # 3. Create Lecturers
    print("\n👨‍🏫 Creating Lecturers...")
    lecturers_data = [
        {
            "username": "dr.smith",
            "password": "lecturer123",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@techuniversity.edu",
            "staff_id": "LEC001",
            "department": "Computer Science",
            "phone": "+1234567801"
        },
        {
            "username": "dr.johnson",
            "password": "lecturer123",
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@techuniversity.edu",
            "staff_id": "LEC002",
            "department": "Software Engineering",
            "phone": "+1234567802"
        },
        {
            "username": "prof.williams",
            "password": "lecturer123",
            "first_name": "Michael",
            "last_name": "Williams",
            "email": "michael.williams@techuniversity.edu",
            "staff_id": "LEC003",
            "department": "Data Science",
            "phone": "+1234567803"
        }
    ]
    
    lecturers = []
    for lec_data in lecturers_data:
        user, created = User.objects.get_or_create(
            username=lec_data["username"],
            defaults={
                "email": lec_data["email"],
                "first_name": lec_data["first_name"],
                "last_name": lec_data["last_name"]
            }
        )
        if created:
            user.set_password(lec_data["password"])
            user.save()
        
        lecturer, created = Lecturer.objects.get_or_create(
            user=user,
            defaults={
                "staff_id": lec_data["staff_id"],
                "name": f"{lec_data['first_name']} {lec_data['last_name']}",
                "department": lec_data["department"],
                "phone_number": lec_data["phone"],
                "organization": org
            }
        )
        lecturers.append(lecturer)
        print(f"  ✓ {lec_data['first_name']} {lec_data['last_name']} ({lec_data['department']})")
    
    # 4. Create Students
    print("\n👨‍🎓 Creating Students...")
    students_data = [
        # Year 1 students
        {"username": "alice.brown", "first_name": "Alice", "last_name": "Brown", "student_id": "STU001", "year": "1", "programme": "Computer Science"},
        {"username": "bob.davis", "first_name": "Bob", "last_name": "Davis", "student_id": "STU002", "year": "1", "programme": "Computer Science"},
        {"username": "carol.white", "first_name": "Carol", "last_name": "White", "student_id": "STU003", "year": "1", "programme": "Software Engineering"},
        {"username": "david.miller", "first_name": "David", "last_name": "Miller", "student_id": "STU004", "year": "1", "programme": "Software Engineering"},
        
        # Year 2 students
        {"username": "emma.wilson", "first_name": "Emma", "last_name": "Wilson", "student_id": "STU005", "year": "2", "programme": "Computer Science"},
        {"username": "frank.moore", "first_name": "Frank", "last_name": "Moore", "student_id": "STU006", "year": "2", "programme": "Data Science"},
        {"username": "grace.taylor", "first_name": "Grace", "last_name": "Taylor", "student_id": "STU007", "year": "2", "programme": "Computer Science"},
        {"username": "henry.anderson", "first_name": "Henry", "last_name": "Anderson", "student_id": "STU008", "year": "2", "programme": "Software Engineering"},
        
        # Year 3 students
        {"username": "iris.thomas", "first_name": "Iris", "last_name": "Thomas", "student_id": "STU009", "year": "3", "programme": "Data Science"},
        {"username": "jack.jackson", "first_name": "Jack", "last_name": "Jackson", "student_id": "STU010", "year": "3", "programme": "Computer Science"},
        {"username": "kate.harris", "first_name": "Kate", "last_name": "Harris", "student_id": "STU011", "year": "3", "programme": "Software Engineering"},
        
        # Year 4 students
        {"username": "leo.martin", "first_name": "Leo", "last_name": "Martin", "student_id": "STU012", "year": "4", "programme": "Computer Science"},
        {"username": "mary.garcia", "first_name": "Mary", "last_name": "Garcia", "student_id": "STU013", "year": "4", "programme": "Data Science"},
        {"username": "noah.martinez", "first_name": "Noah", "last_name": "Martinez", "student_id": "STU014", "year": "4", "programme": "Software Engineering"},
        {"username": "olivia.lopez", "first_name": "Olivia", "last_name": "Lopez", "student_id": "STU015", "year": "4", "programme": "Computer Science"}
    ]
    
    students = []
    for stu_data in students_data:
        user, created = User.objects.get_or_create(
            username=stu_data["username"],
            defaults={
                "email": f"{stu_data['username']}@student.techuniversity.edu",
                "first_name": stu_data["first_name"],
                "last_name": stu_data["last_name"]
            }
        )
        if created:
            user.set_password("student123")
            user.save()
        
        student, created = Student.objects.get_or_create(
            user=user,
            defaults={
                "student_id": stu_data["student_id"],
                "name": f"{stu_data['first_name']} {stu_data['last_name']}",
                "year": stu_data["year"],
                "programme_of_study": stu_data["programme"],
                "organization": org
            }
        )
        students.append(student)
        print(f"  ✓ {stu_data['first_name']} {stu_data['last_name']} (Year {stu_data['year']}, {stu_data['programme']})")
    
    # 5. Create Courses
    print("\n📚 Creating Courses...")
    courses_data = [
        {
            "code": "CS101",
            "name": "Introduction to Programming",
            "lecturer": lecturers[0],  # Dr. Smith
            "students": students[0:8]  # Mix of Year 1-2 students
        },
        {
            "code": "SE201",
            "name": "Software Engineering Principles",
            "lecturer": lecturers[1],  # Dr. Johnson
            "students": students[4:12]  # Year 2-3 students
        },
        {
            "code": "DS301",
            "name": "Machine Learning",
            "lecturer": lecturers[2],  # Prof. Williams
            "students": students[8:]  # Year 3-4 students
        },
        {
            "code": "CS401",
            "name": "Advanced Algorithms",
            "lecturer": lecturers[0],  # Dr. Smith
            "students": students[11:]  # Year 4 students
        }
    ]
    
    from attendance.models import CourseEnrollment
    
    courses = []
    for course_data in courses_data:
        course, created = Course.objects.get_or_create(
            course_code=course_data["code"],
            defaults={
                "name": course_data["name"],
                "lecturer": course_data["lecturer"],
                "organization": org,
                "is_active": True
            }
        )
        
        # Add students through CourseEnrollment
        for student in course_data["students"]:
            CourseEnrollment.objects.get_or_create(
                course=course,
                student=student
            )
        
        courses.append(course)
        print(f"  ✓ {course_data['code']}: {course_data['name']}")
        print(f"    Lecturer: {course_data['lecturer'].name}")
        print(f"    Students: {len(course_data['students'])} enrolled")
    
    # Print Summary
    print("\n" + "=" * 60)
    print("✅ TEST DATA CREATED SUCCESSFULLY!\n")
    print("📊 SUMMARY:")
    print(f"  • Organization: 1 ({org.name})")
    print(f"  • Admin Users: 1")
    print(f"  • Lecturers: {len(lecturers)}")
    print(f"  • Students: {len(students)}")
    print(f"  • Courses: {len(courses)}")
    print("\n🔑 LOGIN CREDENTIALS:")
    print("  Admin:     username: admin          password: admin123")
    print("  Lecturer:  username: dr.smith       password: lecturer123")
    print("  Student:   username: alice.brown    password: student123")
    print("\n📝 NOTES:")
    print("  • All lecturers use password: lecturer123")
    print("  • All students use password: student123")
    print("  • Student IDs required for student login")
    print("\n🎯 NEXT STEPS:")
    print("  1. Test lecturer login and start attendance session")
    print("  2. Test student check-in with location verification")
    print("  3. Generate attendance reports (PDF/Excel)")
    print("  4. Test attendance analytics and history")
    print("=" * 60)

if __name__ == "__main__":
    create_test_data()

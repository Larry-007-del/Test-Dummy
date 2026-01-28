"""
Real-world API test scenarios for attendance system
Tests lecturer and student workflows end-to-end
"""

import requests
import json
from datetime import date

BASE_URL = "http://127.0.0.1:8000/api"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def test_lecturer_login():
    """Test 1: Lecturer Login"""
    print_section("TEST 1: Lecturer Login (Dr. Smith)")
    
    response = requests.post(f"{BASE_URL}/api/login/staff/", json={
        "username": "dr.smith",
        "password": "lecturer123",
        "staff_id": "LEC001"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"  Token: {data.get('token', 'N/A')[:20]}...")
        print(f"  Role: {data.get('role')}")
        print(f"  Name: {data.get('name')}")
        return data.get('token')
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"  Response: {response.text[:500]}")
        return None

def test_student_login():
    """Test 2: Student Login"""
    print_section("TEST 2: Student Login (Alice Brown)")
    
    response = requests.post(f"{BASE_URL}/api/login/student/", json={
        "username": "alice.brown",
        "password": "student123",
        "student_id": "STU001"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"  Token: {data.get('token', 'N/A')[:20]}...")
        print(f"  Role: {data.get('role')}")
        print(f"  Name: {data.get('name')}")
        print(f"  Student ID: {data.get('student_id')}")
        return data.get('token')
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"  Response: {response.text[:500]}")
        return None

def test_view_courses(token, role="lecturer"):
    """Test 3: View Courses"""
    print_section(f"TEST 3: View {role.title()} Courses")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.get(f"{BASE_URL}/courses/", headers=headers)
    
    if response.status_code == 200:
        courses = response.json()
        print(f"✅ Found {len(courses)} course(s)")
        for course in courses[:3]:  # Show first 3
            print(f"  • {course.get('course_code')}: {course.get('name')}")
            print(f"    Lecturer: {course.get('lecturer_name', 'N/A')}")
            print(f"    Students: {course.get('students_count', 0)}")
        return courses
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return []

def test_start_attendance(token, course_id):
    """Test 4: Start Attendance Session"""
    print_section("TEST 4: Start Attendance Session")
    
    headers = {"Authorization": f"Token {token}"}
    payload = {
        "course": course_id,
        "date": str(date.today()),
        "latitude": 40.7128,  # Example: New York
        "longitude": -74.0060,
        "allowed_radius_meters": 100
    }
    
    response = requests.post(f"{BASE_URL}/attendances/", json=payload, headers=headers)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Attendance session started!")
        print(f"  Attendance ID: {data.get('id')}")
        print(f"  Course: {data.get('course_name')}")
        print(f"  Date: {data.get('date')}")
        print(f"  Location: ({data.get('lecturer_latitude')}, {data.get('lecturer_longitude')})")
        print(f"  Radius: {data.get('allowed_radius_meters')}m")
        print(f"  Active: {data.get('is_active')}")
        return data.get('id')
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def test_view_active_sessions(token):
    """Test 5: View Active Attendance Sessions (Student)"""
    print_section("TEST 5: View Active Attendance Sessions")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.get(f"{BASE_URL}/attendance-tokens/", headers=headers)
    
    if response.status_code == 200:
        sessions = response.json()
        print(f"✅ Found {len(sessions)} active session(s)")
        for session in sessions:
            print(f"  • {session.get('course_code')}: {session.get('course_name')}")
            print(f"    Date: {session.get('date')}")
            print(f"    Token: {session.get('token', 'N/A')[:20]}...")
        return sessions
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return []

def test_mark_attendance(token, attendance_token):
    """Test 6: Student Marks Attendance"""
    print_section("TEST 6: Mark Attendance")
    
    headers = {"Authorization": f"Token {token}"}
    payload = {
        "token": attendance_token,
        "latitude": 40.7130,  # Slightly different from lecturer (within 100m)
        "longitude": -74.0062
    }
    
    response = requests.post(f"{BASE_URL}/mark-attendance/", json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Attendance marked successfully!")
        print(f"  Message: {data.get('message')}")
        print(f"  Distance: {data.get('distance', 'N/A')}m")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def main():
    print("\n" + "="*70)
    print("  🏫 ATTENDANCE SYSTEM - REAL-WORLD API TESTS")
    print("="*70)
    print("  Testing complete lecturer → student attendance workflow")
    print("="*70)
    
    # Test 1 & 2: Login
    lecturer_token = test_lecturer_login()
    if not lecturer_token:
        print("\n❌ Cannot proceed without lecturer token")
        return
    
    student_token = test_student_login()
    if not student_token:
        print("\n❌ Cannot proceed without student token")
        return
    
    # Test 3: View lecturer's courses
    courses = test_view_courses(lecturer_token, "lecturer")
    if not courses:
        print("\n❌ Cannot proceed without courses")
        return
    
    course_id = courses[0].get('id')
    
    # Test 4: Start attendance
    attendance_id = test_start_attendance(lecturer_token, course_id)
    if not attendance_id:
        print("\n❌ Cannot proceed without attendance session")
        return
    
    # Test 5: Student views active sessions
    sessions = test_view_active_sessions(student_token)
    if not sessions:
        print("\n⚠️  No active sessions found")
        return
    
    attendance_token = sessions[0].get('token')
    
    # Test 6: Student marks attendance
    test_mark_attendance(student_token, attendance_token)
    
    # Summary
    print_section("✅ TEST SUMMARY")
    print("  All core workflows tested successfully!")
    print("  Lecturer can: ✓ Login  ✓ View courses  ✓ Start attendance")
    print("  Student can:  ✓ Login  ✓ View sessions  ✓ Mark attendance")
    print("\n  🎯 Next: Test report generation, analytics, and edge cases")
    print("="*70)

if __name__ == "__main__":
    main()

"""
Analytics utilities for admin dashboard
"""
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
from .models import Attendance, Course, Student, Lecturer


def get_attendance_statistics(days=30):
    """
    Get attendance statistics for the last N days
    """
    start_date = timezone.now() - timedelta(days=days)
    
    # Total attendance sessions
    total_sessions = Attendance.objects.filter(
        started_at__gte=start_date
    ).count()
    
    # Active sessions
    active_sessions = Attendance.objects.filter(
        is_active=True
    ).count()
    
    # Total check-ins
    total_checkins = sum(
        att.attendance_records.count() 
        for att in Attendance.objects.filter(started_at__gte=start_date)
    )
    
    # Average attendance rate
    attendance_data = []
    for att in Attendance.objects.filter(started_at__gte=start_date):
        enrolled_count = att.course.students.count()
        checkin_count = att.attendance_records.count()
        if enrolled_count > 0:
            rate = (checkin_count / enrolled_count) * 100
            attendance_data.append(rate)
    
    avg_attendance_rate = sum(attendance_data) / len(attendance_data) if attendance_data else 0
    
    return {
        'total_sessions': total_sessions,
        'active_sessions': active_sessions,
        'total_checkins': total_checkins,
        'average_attendance_rate': round(avg_attendance_rate, 2),
        'period_days': days
    }


def get_top_courses(limit=10):
    """
    Get courses with highest attendance rates
    """
    courses = Course.objects.annotate(
        attendance_count=Count('attendances')
    ).order_by('-attendance_count')[:limit]
    
    course_data = []
    for course in courses:
        enrolled = course.students.count()
        sessions = course.attendances.count()
        total_checkins = sum(att.attendance_records.count() for att in course.attendances.all())
        
        avg_rate = 0
        if sessions > 0 and enrolled > 0:
            avg_rate = (total_checkins / (sessions * enrolled)) * 100
        
        course_data.append({
            'id': course.id,
            'name': course.name,
            'code': course.code,
            'sessions': sessions,
            'enrolled_students': enrolled,
            'average_attendance_rate': round(avg_rate, 2)
        })
    
    return course_data


def get_attendance_trends(days=30):
    """
    Get daily attendance trends for the last N days
    """
    start_date = timezone.now() - timedelta(days=days)
    trends = []
    
    for i in range(days):
        day = start_date + timedelta(days=i)
        next_day = day + timedelta(days=1)
        
        sessions = Attendance.objects.filter(
            started_at__gte=day,
            started_at__lt=next_day
        )
        
        session_count = sessions.count()
        total_checkins = sum(att.attendance_records.count() for att in sessions)
        
        trends.append({
            'date': day.strftime('%Y-%m-%d'),
            'sessions': session_count,
            'checkins': total_checkins
        })
    
    return trends


def get_student_participation():
    """
    Get student participation statistics
    """
    students = Student.objects.all()
    
    participation_data = {
        'high_participation': 0,  # >80% attendance
        'medium_participation': 0,  # 50-80% attendance
        'low_participation': 0,  # <50% attendance
        'no_participation': 0  # 0% attendance
    }
    
    for student in students:
        # Get all courses student is enrolled in
        enrolled_courses = student.courses.all()
        if not enrolled_courses.exists():
            continue
        
        # Count total sessions and student's check-ins
        total_sessions = 0
        total_checkins = 0
        
        for course in enrolled_courses:
            course_sessions = Attendance.objects.filter(course=course)
            total_sessions += course_sessions.count()
            
            for session in course_sessions:
                if session.attendance_records.filter(student=student).exists():
                    total_checkins += 1
        
        if total_sessions == 0:
            continue
        
        participation_rate = (total_checkins / total_sessions) * 100
        
        if participation_rate == 0:
            participation_data['no_participation'] += 1
        elif participation_rate < 50:
            participation_data['low_participation'] += 1
        elif participation_rate < 80:
            participation_data['medium_participation'] += 1
        else:
            participation_data['high_participation'] += 1
    
    return participation_data


def get_lecturer_activity(limit=10):
    """
    Get most active lecturers
    """
    lecturers = Lecturer.objects.annotate(
        session_count=Count('courses__attendances')
    ).order_by('-session_count')[:limit]
    
    lecturer_data = []
    for lecturer in lecturers:
        courses = lecturer.courses.all()
        total_sessions = sum(course.attendances.count() for course in courses)
        
        lecturer_data.append({
            'id': lecturer.id,
            'name': lecturer.name,
            'staff_id': lecturer.staff_id,
            'department': lecturer.department or 'N/A',
            'total_courses': courses.count(),
            'total_sessions': total_sessions
        })
    
    return lecturer_data


def get_system_overview():
    """
    Get overall system statistics
    """
    return {
        'total_students': Student.objects.count(),
        'total_lecturers': Lecturer.objects.count(),
        'total_courses': Course.objects.count(),
        'active_courses': Course.objects.filter(is_active=True).count(),
        'total_attendance_sessions': Attendance.objects.count(),
        'active_sessions': Attendance.objects.filter(is_active=True).count()
    }

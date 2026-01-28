"""
Celery tasks for asynchronous operations
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .email_utils import send_verification_email, send_password_reset_email, send_sms
from .report_utils import generate_attendance_pdf, generate_attendance_excel
from .models import User, Attendance
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_email_async(self, user_id):
    """
    Send verification email asynchronously
    """
    try:
        user = User.objects.get(id=user_id)
        send_verification_email(user)
        logger.info(f"Verification email sent to {user.email}")
        return f"Verification email sent to {user.email}"
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        return f"User with id {user_id} not found"
    except Exception as e:
        logger.error(f"Error sending verification email: {str(e)}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_password_reset_email_async(self, user_id):
    """
    Send password reset email asynchronously
    """
    try:
        user = User.objects.get(id=user_id)
        send_password_reset_email(user)
        logger.info(f"Password reset email sent to {user.email}")
        return f"Password reset email sent to {user.email}"
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        return f"User with id {user_id} not found"
    except Exception as e:
        logger.error(f"Error sending password reset email: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_attendance_notification_async(self, student_name, course_name, email, phone_number=None):
    """
    Send attendance notification (email and SMS) asynchronously
    """
    try:
        # Send email
        subject = f"Attendance Confirmed - {course_name}"
        message = f"Hello {student_name},\n\nYour attendance for {course_name} has been recorded successfully.\n\nThank you!"
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        logger.info(f"Attendance email sent to {email}")
        
        # Send SMS if phone number provided and SMS is enabled
        if phone_number and settings.SMS_ENABLED:
            sms_message = f"Hello {student_name}, your attendance for {course_name} has been recorded."
            send_sms(phone_number, sms_message)
            logger.info(f"Attendance SMS sent to {phone_number}")
        
        return f"Notification sent to {email}"
    except Exception as e:
        logger.error(f"Error sending attendance notification: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))


@shared_task(bind=True)
def generate_attendance_report_async(self, attendance_ids, format_type='pdf'):
    """
    Generate attendance report asynchronously
    Note: This is a placeholder - actual report generation should save to storage
    """
    try:
        attendances = Attendance.objects.filter(id__in=attendance_ids)
        
        if format_type == 'pdf':
            buffer = generate_attendance_pdf(attendances)
        else:
            buffer = generate_attendance_excel(attendances)
        
        logger.info(f"Generated {format_type} report for {len(attendance_ids)} attendances")
        # In production, save buffer to cloud storage and return URL
        return f"Report generated for {len(attendance_ids)} attendances"
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise


@shared_task
def cleanup_expired_tokens():
    """
    Periodic task to clean up expired tokens
    """
    from .models import EmailVerificationToken, PasswordResetToken
    from django.utils import timezone
    
    now = timezone.now()
    
    # Delete expired verification tokens
    expired_verification = EmailVerificationToken.objects.filter(expires_at__lt=now)
    verification_count = expired_verification.count()
    expired_verification.delete()
    
    # Delete expired password reset tokens
    expired_reset = PasswordResetToken.objects.filter(expires_at__lt=now)
    reset_count = expired_reset.count()
    expired_reset.delete()
    
    logger.info(f"Cleaned up {verification_count} expired verification tokens and {reset_count} expired password reset tokens")
    return f"Cleaned up {verification_count + reset_count} expired tokens"


@shared_task
def send_attendance_reminders():
    """
    Periodic task to send attendance reminders for active sessions
    """
    from .email_utils import send_attendance_reminder
    
    active_attendances = Attendance.objects.filter(is_active=True)
    reminder_count = 0
    
    for attendance in active_attendances:
        # Get students who haven't checked in yet
        enrolled_students = attendance.course.students.all()
        checked_in_student_ids = [s.id for s in attendance.present_students.all()]
        
        for student in enrolled_students:
            if student.id not in checked_in_student_ids:
                send_attendance_reminder(student, attendance)
                reminder_count += 1
    
    logger.info(f"Sent {reminder_count} attendance reminders")
    return f"Sent {reminder_count} reminders"

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import EmailVerificationToken, PasswordResetToken

# SMS support
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False


def send_sms(to_phone, message):
    """Send SMS notification using Twilio"""
    if not settings.SMS_ENABLED or not TWILIO_AVAILABLE:
        return False
    
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return False
    
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        message = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        
        return True
    except Exception as e:
        print(f"SMS send failed: {e}")
        return False


def send_verification_email(user, request=None):
    """Send email verification link to user"""
    token = EmailVerificationToken.objects.create(user=user)
    
    verification_url = f"{settings.FRONTEND_URL}/verify-email/{token.token}"
    
    subject = 'Verify your email address'
    message = f"""
    Hello {user.username},
    
    Thank you for registering! Please verify your email address by clicking the link below:
    
    {verification_url}
    
    This link will expire in 24 hours.
    
    If you did not create this account, please ignore this email.
    
    Best regards,
    Attendance System Team
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    
    return token


def send_password_reset_email(user, request=None):
    """Send password reset link to user"""
    token = PasswordResetToken.objects.create(user=user)
    
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token.token}"
    
    subject = 'Reset your password'
    message = f"""
    Hello {user.username},
    
    You requested to reset your password. Click the link below to set a new password:
    
    {reset_url}
    
    This link will expire in 1 hour.
    
    If you did not request this, please ignore this email and your password will remain unchanged.
    
    Best regards,
    Attendance System Team
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    
    return token


def send_attendance_notification(student, course, lecturer):
    """Send attendance notification to student via email and SMS"""
    if not student.user.email:
        return
    
    # Email notification
    subject = f'Attendance recorded for {course.name}'
    message = f"""
    Hello {student.name},
    
    Your attendance has been recorded for:
    
    Course: {course.name} ({course.course_code})
    Lecturer: {lecturer.name}
    Date: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}
    
    Thank you for attending!
    
    Best regards,
    Attendance System
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [student.user.email],
        fail_silently=True,
    )
    
    # SMS notification (if phone number available)
    if student.phone_number:
        sms_message = f"Attendance recorded for {course.course_code} on {timezone.now().strftime('%m/%d/%Y at %I:%M %p')}. Thank you!"
        send_sms(student.phone_number, sms_message)


def send_attendance_reminder(student, course, lecturer):
    """Send reminder to student about upcoming class"""
    if not student.user.email:
        return
    
    # Email reminder
    subject = f'Reminder: {course.name} class starting soon'
    message = f"""
    Hello {student.name},
    
    This is a reminder that your class is starting soon:
    
    Course: {course.name} ({course.course_code})
    Lecturer: {lecturer.name}
    
    Don't forget to check in for attendance!
    
    Best regards,
    Attendance System
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [student.user.email],
        fail_silently=True,
    )
    
    # SMS reminder
    if student.phone_number:
        sms_message = f"Reminder: {course.course_code} class starting soon. Don't forget to check in!"
        send_sms(student.phone_number, sms_message)

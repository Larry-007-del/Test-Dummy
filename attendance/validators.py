import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


def validate_password_strength(password):
    """
    Validate password strength:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise ValidationError(
            _('Password must be at least 8 characters long.'),
            code='password_too_short'
        )
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError(
            _('Password must contain at least one uppercase letter.'),
            code='password_no_upper'
        )
    
    if not re.search(r'[a-z]', password):
        raise ValidationError(
            _('Password must contain at least one lowercase letter.'),
            code='password_no_lower'
        )
    
    if not re.search(r'\d', password):
        raise ValidationError(
            _('Password must contain at least one digit.'),
            code='password_no_digit'
        )
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError(
            _('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>).'),
            code='password_no_special'
        )
    
    return True


def get_password_requirements():
    """Return password requirements as a dictionary for frontend display"""
    return {
        'min_length': 8,
        'require_uppercase': True,
        'require_lowercase': True,
        'require_digit': True,
        'require_special': True,
        'special_chars': '!@#$%^&*(),.?":{}|<>',
    }

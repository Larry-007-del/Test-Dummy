from django.core.checks import Error, register
from django.conf import settings

@register()
def check_secret_key_secure(app_configs, **kwargs):
    """Ensure SECRET_KEY is set to a non-default value when DEBUG is False."""
    errors = []
    sk = getattr(settings, 'SECRET_KEY', '')
    if not settings.DEBUG:
        if not sk or sk.startswith('django-insecure'):
            errors.append(
                Error(
                    'SECRET_KEY is insecure for production. Set SECRET_KEY as an env var.',
                    id='attendance.E001',
                )
            )
    return errors

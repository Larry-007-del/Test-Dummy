from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'

    def ready(self):
        # Register system checks
        try:
            import attendance.checks  # noqa: F401
        except Exception:
            # Fail-safe: do not crash app import on check registration errors
            pass

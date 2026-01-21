from django.test import TestCase, override_settings
from django.core import checks


class SecurityChecksTest(TestCase):
    def test_secret_key_insecure_when_debug_false(self):
        with override_settings(DEBUG=False, SECRET_KEY='django-insecure-xyz'):
            errors = checks.run_checks()
            found = any(getattr(e, 'id', '') == 'attendance.E001' for e in errors)
            self.assertTrue(found, "attendance.E001 should be reported when SECRET_KEY is insecure and DEBUG=False")

    def test_no_error_when_debug_true(self):
        with override_settings(DEBUG=True, SECRET_KEY='django-insecure-xyz'):
            errors = checks.run_checks()
            found = any(getattr(e, 'id', '') == 'attendance.E001' for e in errors)
            self.assertFalse(found, "attendance.E001 should not be reported when DEBUG is True")

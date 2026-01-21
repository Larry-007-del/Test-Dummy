"""
WSGI config for attendance_system project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_system.settings')

application = get_wsgi_application()

# --- Auto-create or update admin user on every app start ---
try:
	from django.contrib.auth.models import User
	from django.db.utils import OperationalError
	admin_username = 'admin'
	admin_password = '123'
	admin_email = 'admin@example.com'
	if User.objects.filter(username=admin_username).exists():
		user = User.objects.get(username=admin_username)
		user.set_password(admin_password)
		user.is_superuser = True
		user.is_staff = True
		user.email = admin_email
		user.save()
	else:
		User.objects.create_superuser(admin_username, admin_email, admin_password)
except OperationalError:
	# Database might not be ready during migrations
	pass
except Exception as e:
	# Avoid crashing WSGI for any other reason
	pass

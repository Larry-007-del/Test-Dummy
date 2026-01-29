from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = 'Creates a superuser if none exists'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not username or not password:
            self.stdout.write(self.style.WARNING('DJANGO_SUPERUSER_USERNAME or DJANGO_SUPERUSER_PASSWORD not set. Skipping admin creation.'))
            return

        if not User.objects.filter(username=username).exists():
            self.stdout.write(f'Creating superuser {username}...')
            try:
                User.objects.create_superuser(username=username, email=email, password=password)
                self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to create superuser: {str(e)}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" already exists. Skipping.'))

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creates a superuser with username "admin" and password "123" if it does not exist.'

    def handle(self, *args, **options):
        username = 'admin'
        password = '123'
        email = 'admin@example.com'
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS('Superuser created: admin / 123'))
        else:
            self.stdout.write(self.style.WARNING('Superuser already exists.'))

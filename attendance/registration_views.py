from django.db import transaction
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .models import Student, Lecturer, Organization
from .serializers import UserSerializer

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data
        role = data.get('role', 'student')
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        first_name = data.get('first_name')
        last_name = data.get('last_name')

        if not all([username, password, email, first_name, last_name]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Create User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        try:
            # Handle Role Specifics
            if role == 'student':
                student_id = data.get('student_id')
                if not student_id:
                     raise ValueError("Student ID is required")
                
                # Assign to default organization if exists, or None
                org = Organization.objects.first() 
                
                Student.objects.create(
                    user=user,
                    student_id=student_id,
                    name=f"{first_name} {last_name}",
                    programme_of_study=data.get('programme', 'General'),
                    year=data.get('year', 1),
                    organization=org
                )
            
            elif role == 'lecturer':
                staff_id = data.get('staff_id')
                if not staff_id:
                     raise ValueError("Staff ID is required")

                org = Organization.objects.first()

                Lecturer.objects.create(
                    user=user,
                    staff_id=staff_id,
                    name=f"{first_name} {last_name}",
                    department=data.get('department', 'General'),
                    organization=org
                )
            else:
                 return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'message': 'Registration successful. Please login.',
                'username': user.username
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Transaction will rollback automatically
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

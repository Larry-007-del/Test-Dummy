"""
Organization (multi-tenancy) utilities and middleware
"""
from django.utils.deprecation import MiddlewareMixin
from .models import Organization


class OrganizationMiddleware(MiddlewareMixin):
    """
    Middleware to detect and set current organization based on:
    1. Subdomain (e.g., university-a.attendancesystem.com)
    2. Path prefix (e.g., /org/university-a/)
    3. Custom header (X-Organization-Slug)
    """
    
    def process_request(self, request):
        organization = None
        
        # Method 1: Subdomain-based routing
        host = request.get_host().split(':')[0]  # Remove port
        if '.' in host:
            subdomain = host.split('.')[0]
            try:
                organization = Organization.objects.get(domain=subdomain, is_active=True)
            except Organization.DoesNotExist:
                pass
        
        # Method 2: Path-based routing (e.g., /org/university-a/)
        if not organization and request.path.startswith('/org/'):
            path_parts = request.path.split('/')
            if len(path_parts) >= 3:
                org_slug = path_parts[2]
                try:
                    organization = Organization.objects.get(slug=org_slug, is_active=True)
                except Organization.DoesNotExist:
                    pass
        
        # Method 3: Header-based (useful for API clients)
        if not organization:
            org_slug = request.META.get('HTTP_X_ORGANIZATION_SLUG')
            if org_slug:
                try:
                    organization = Organization.objects.get(slug=org_slug, is_active=True)
                except Organization.DoesNotExist:
                    pass
        
        # Attach organization to request
        request.organization = organization
        
        return None


def get_user_organization(user):
    """
    Get the organization for a given user
    """
    if hasattr(user, 'student'):
        return user.student.organization
    elif hasattr(user, 'lecturer'):
        return user.lecturer.organization
    return None


def filter_by_organization(queryset, organization):
    """
    Filter queryset by organization (if organization is set)
    """
    if organization:
        return queryset.filter(organization=organization)
    return queryset

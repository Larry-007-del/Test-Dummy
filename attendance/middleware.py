from django.core.cache import cache
from django.http import JsonResponse
from functools import wraps
import time


class RateLimitMiddleware:
    """
    Simple rate limiting middleware
    Limits: 100 requests per minute per IP
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 100  # requests
        self.time_window = 60  # seconds

    def __call__(self, request):
        # Skip rate limiting for health check and static files
        if request.path.startswith('/static/') or request.path == '/api/healthz/':
            return self.get_response(request)

        ip_address = self.get_client_ip(request)
        cache_key = f'rate_limit:{ip_address}'
        
        # Get current request count
        request_count = cache.get(cache_key, 0)
        
        if request_count >= self.rate_limit:
            return JsonResponse(
                {'error': 'Rate limit exceeded. Please try again later.'},
                status=429
            )
        
        # Increment counter
        cache.set(cache_key, request_count + 1, self.time_window)
        
        response = self.get_response(request)
        
        # Add rate limit headers
        response['X-RateLimit-Limit'] = str(self.rate_limit)
        response['X-RateLimit-Remaining'] = str(max(0, self.rate_limit - request_count - 1))
        
        return response

    def get_client_ip(self, request):
        """Extract client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

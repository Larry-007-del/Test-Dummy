from rest_framework.throttling import SimpleRateThrottle

class AttendanceTokenBurstThrottle(SimpleRateThrottle):
    scope = 'attendance_token_burst'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        # Use user PK for per-user throttling
        ident = request.user.pk
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class FeedbackRateThrottle(SimpleRateThrottle):
    """Rate limit feedback submissions to avoid spam/abuse."""
    scope = 'feedback'

    def get_cache_key(self, request, view):
        # Allow throttling per authenticated user; otherwise fallback to IP-based identity
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }

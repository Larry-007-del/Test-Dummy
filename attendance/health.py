from django.http import JsonResponse
from django.views import View
from django.db import connections, OperationalError
from django.core.cache import cache


class HealthCheckView(View):
    """Simple health check endpoint that verifies DB and cache availability."""

    def get(self, request, *args, **kwargs):
        checks = {
            'status': 'ok',
            'db': 'unknown',
            'cache': 'unknown',
        }
        # Check database
        try:
            with connections['default'].cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
            checks['db'] = 'ok'
        except OperationalError:
            checks['db'] = 'error'
            checks['status'] = 'fail'

        # Check cache (best-effort)
        try:
            cache_key = 'health-check-key'
            cache.set(cache_key, 'ok', timeout=5)
            if cache.get(cache_key) == 'ok':
                checks['cache'] = 'ok'
            else:
                checks['cache'] = 'error'
                checks['status'] = 'fail'
        except Exception:
            checks['cache'] = 'error'
            checks['status'] = 'fail'

        status_code = 200 if checks['status'] == 'ok' else 500
        return JsonResponse(checks, status=status_code)

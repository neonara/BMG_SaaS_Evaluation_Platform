from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    try:
        connection.ensure_connection()
        return JsonResponse({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'database': str(e)}, status=500)

# Start with minimal URL patterns
urlpatterns = [
    path("api/health/", health_check, name="health_check"),
    path("bmg-admin/", admin.site.urls),
]

# Add debug toolbar if in DEBUG
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    except ImportError:
        pass

# Lazy import for auth URLs - they'll be added when the app is ready
def finalize_urls():
    """Add remaining URL patterns after apps are ready."""
    from rest_framework_simplejwt.views import TokenRefreshView
    from apps.users.urls import auth_token, auth
    from config.api_router import urlpatterns as api_urls
    
    urlpatterns.extend([
        path("api/auth/token/", include(auth_token)),
        path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
        path("api/auth/", include(auth)),
        path("api/v1/", include(api_urls)),
    ])

# Signal to add URLs after apps are ready
from django.apps import apps
if apps.ready:
    finalize_urls()
else:
    from django.apps import AppConfig
    AppConfig.ready = lambda self: finalize_urls()

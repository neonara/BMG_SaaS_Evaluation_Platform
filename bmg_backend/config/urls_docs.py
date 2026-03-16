"""
config/urls_docs.py

API documentation URL patterns.
Imported into config/urls.py ONLY in non-production environments,
OR behind a login check in production.

In production:
- The /api/schema/ endpoint is DISABLED (SPECTACULAR_SETTINGS["SERVE_INCLUDE_SCHEMA"] = False)
- Swagger UI is accessible only to authenticated Super Admin BMG users
- Redoc is similarly restricted

Usage in config/urls.py:
    from config.urls_docs import docs_urlpatterns
    urlpatterns += docs_urlpatterns
"""
from django.conf import settings
from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import IsAuthenticated

from core.permissions.permissions import IsSuperAdmin


class SuperAdminOrDebugPermission(IsAuthenticated):
    """
    Allow access to API docs if:
    - DEBUG is True (development)
    - OR the user is a Super Admin BMG
    """
    def has_permission(self, request, view):
        if settings.DEBUG:
            return True
        return (
            super().has_permission(request, view)
            and IsSuperAdmin().has_permission(request, view)
        )


# Apply the permission to all doc views
SpectacularAPIView.permission_classes = [SuperAdminOrDebugPermission]
SpectacularSwaggerView.permission_classes = [SuperAdminOrDebugPermission]
SpectacularRedocView.permission_classes = [SuperAdminOrDebugPermission]

docs_urlpatterns = [
    # Raw OpenAPI 3.1 schema (JSON or YAML via ?format=)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),

    # Swagger UI — interactive API explorer
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),

    # Redoc — clean read-only reference documentation
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

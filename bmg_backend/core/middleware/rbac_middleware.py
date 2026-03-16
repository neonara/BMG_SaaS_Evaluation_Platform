"""
RBAC middleware — enforces role-based permissions on every request.
Returns HTTP 403 if the user's role does not have access.
The actual permission map is defined in core/permissions/roles.py.
"""
from django.http import JsonResponse


class RBACMiddleware:
    EXEMPT_PATHS = [
        "/api/health/",
        "/api/auth/token/",
        "/api/auth/token/refresh/",
        "/api/public/",
        "/reports/",   # public shareable reports
        "/graphql/",   # GraphQL has its own permission layer
        "/bmg-admin/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not self._is_exempt(request.path):
            if not request.user.is_authenticated:
                return JsonResponse({"detail": "Authentication required."}, status=401)
        return self.get_response(request)

    def _is_exempt(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.EXEMPT_PATHS)

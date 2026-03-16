"""
Custom JWT middleware.
Decodes the Bearer token, checks the blacklist, and sets request.user
and request.tenant_schema from the token payload.
Runs after TenantMainMiddleware and AuthenticationMiddleware.
"""
from __future__ import annotations

from django.utils.functional import SimpleLazyObject
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user = SimpleLazyObject(lambda: self._authenticate(request))
        return self.get_response(request)

    @staticmethod
    def _authenticate(request):
        from core.cache.service import is_jwt_blacklisted
        from django.contrib.auth.models import AnonymousUser

        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result is not None:
                user, token = result
                jti = token.get("jti", "")

                # Reject blacklisted tokens — handles logout + deactivation
                if jti and is_jwt_blacklisted(jti):
                    return AnonymousUser()

                # Attach tenant schema from token payload
                request.tenant_schema = token.get("tenant_schema", "public")
                return user
        except (InvalidToken, TokenError):
            pass
        return AnonymousUser()

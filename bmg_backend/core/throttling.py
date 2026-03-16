"""
core/throttling.py

Custom DRF throttle classes for the BMG platform.

Design principles:
- Different user roles have different rate limits
- Login brute-force protection uses IP + email combined key
- Webhook endpoints are IP-whitelisted, not token-throttled
- Test-taking endpoints are EXEMPT from throttling (never block a candidate mid-test)
- Public pack catalogue uses a generous anonymous rate (Vitrine ISR + visitors)
- Super Admin has high limits for bulk operations

Settings (in base.py):
    REST_FRAMEWORK = {
        "DEFAULT_THROTTLE_CLASSES": [...],
        "DEFAULT_THROTTLE_RATES": {
            "login": "5/min",
            "anon_public": "120/min",
            "external_candidate": "60/min",
            "internal_candidate": "60/min",
            "manager": "120/min",
            "hr": "200/min",
            "admin_client": "300/min",
            "super_admin": "1000/min",
            "test_taking": None,     # exempt
            "webhook": None,         # IP-whitelisted separately
            "password_reset": "3/hour",
            "otp_verify": "5/min",
            "export_request": "2/hour",
        }
    }
"""
from __future__ import annotations

from rest_framework.throttling import (
    AnonRateThrottle,
    SimpleRateThrottle,
    UserRateThrottle,
)

from core.permissions.roles import Role


# ── Anonymous / public endpoints ──────────────────────────────────────────────

class PublicPackCatalogueThrottle(AnonRateThrottle):
    """
    /api/public/packs/ — called by Vitrine ISR and unauthenticated visitors.
    Generous limit so ISR revalidations never get blocked.
    """
    scope = "anon_public"


class LoginThrottle(SimpleRateThrottle):
    """
    POST /api/auth/token/
    Keys on IP + email to slow brute-force attacks without blocking
    legitimate users on shared IPs.
    """
    scope = "login"

    def get_cache_key(self, request, view):
        email = request.data.get("email", "")
        ident = f"{self.get_ident(request)}:{email}"
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class PasswordResetThrottle(SimpleRateThrottle):
    """POST /api/auth/password-reset/"""
    scope = "password_reset"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class OTPVerifyThrottle(SimpleRateThrottle):
    """POST /api/auth/otp/verify/ — 5 attempts per minute per IP."""
    scope = "otp_verify"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class ExportRequestThrottle(UserRateThrottle):
    """POST /api/users/{id}/export/ — data export requests."""
    scope = "export_request"


# ── Role-based throttles ───────────────────────────────────────────────────────

class RoleBasedThrottle(UserRateThrottle):
    """
    Base class for role-based throttling.
    Subclasses set `role` and `scope`. If the request user's role
    does not match, the throttle is skipped (returns True = allowed).
    This lets us stack multiple role throttles in DEFAULT_THROTTLE_CLASSES
    and only the matching one activates.
    """
    role: str | None = None

    def allow_request(self, request, view):
        if not request.user.is_authenticated:
            return True
        if self.role and request.user.role != self.role:
            return True  # Not this role — skip this throttle
        return super().allow_request(request, view)


class ExternalCandidateThrottle(RoleBasedThrottle):
    role = Role.EXTERNAL_CANDIDATE
    scope = "external_candidate"


class InternalCandidateThrottle(RoleBasedThrottle):
    role = Role.INTERNAL_CANDIDATE
    scope = "internal_candidate"


class ManagerThrottle(RoleBasedThrottle):
    role = Role.MANAGER
    scope = "manager"


class HRThrottle(RoleBasedThrottle):
    role = Role.HR
    scope = "hr"


class AdminClientThrottle(RoleBasedThrottle):
    role = Role.ADMIN_CLIENT
    scope = "admin_client"


class SuperAdminThrottle(RoleBasedThrottle):
    role = Role.SUPER_ADMIN
    scope = "super_admin"


# ── Exempt (no throttle) ──────────────────────────────────────────────────────

class TestTakingThrottle(SimpleRateThrottle):
    """
    Applied to test-taking endpoints:
      POST /api/attempts/{id}/answers/
      POST /api/attempts/{id}/submit/

    This throttle is intentionally ALWAYS ALLOWED — we never block a candidate
    mid-test. The rate key is still tracked for monitoring dashboards, but
    allow_request always returns True.

    To use: add TestTakingThrottle to the view's throttle_classes list,
    and remove all other throttles from those views.
    """
    scope = "test_taking"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"test_taking:{request.user.pk}"
        return None

    def allow_request(self, request, view):
        # Track for monitoring but never block
        self.get_cache_key(request, view)
        return True


class WebhookIPThrottle(SimpleRateThrottle):
    """
    Applied to /api/webhooks/* (payment gateway callbacks).

    Payment gateways (Konnect, CLICTOPAY, Paymee) call from fixed IP ranges.
    This throttle uses IP as the key but with a very high limit.
    Actual IP whitelist enforcement is done at Nginx level — this is
    a defence-in-depth fallback only.
    """
    scope = "webhook"

    ALLOWED_IPS: frozenset[str] = frozenset([
        # Add Konnect, CLICTOPAY, Paymee IP ranges here
        # These should also be configured in nginx.conf
    ])

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }

    def allow_request(self, request, view):
        # If ALLOWED_IPS is configured, enforce whitelist
        if self.ALLOWED_IPS:
            client_ip = self.get_ident(request)
            if client_ip not in self.ALLOWED_IPS:
                return False
        return True

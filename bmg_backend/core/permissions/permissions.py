"""
Custom DRF permission classes.
"""
from rest_framework.permissions import BasePermission

from core.permissions.roles import Role


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == Role.SUPER_ADMIN
        )


class IsAdminClient(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in {Role.SUPER_ADMIN, Role.ADMIN_CLIENT}
        )


class IsHR(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in {Role.SUPER_ADMIN, Role.ADMIN_CLIENT, Role.HR}
        )


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in {
                Role.SUPER_ADMIN, Role.ADMIN_CLIENT, Role.HR, Role.MANAGER
            }
        )


class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in {
                Role.INTERNAL_CANDIDATE, Role.EXTERNAL_CANDIDATE
            }
        )


class CanMonitorAntiCheat(BasePermission):
    """Super Admin BMG ONLY — HR does NOT have access."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == Role.SUPER_ADMIN
        )

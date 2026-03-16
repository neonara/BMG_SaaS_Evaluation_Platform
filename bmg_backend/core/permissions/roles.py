"""
Central role definitions for RBAC.
Import these constants everywhere — never hardcode role strings.
"""
from enum import StrEnum


class Role(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN_CLIENT = "admin_client"
    HR = "hr"
    MANAGER = "manager"
    INTERNAL_CANDIDATE = "internal_candidate"
    EXTERNAL_CANDIDATE = "external_candidate"


# Roles that can create Personalized tests
CAN_CREATE_PERSONALIZED_TEST = {
    Role.SUPER_ADMIN, Role.ADMIN_CLIENT, Role.HR, Role.MANAGER
}

# Roles that can create sessions directly (no approval needed)
CAN_CREATE_SESSION_DIRECT = {
    Role.SUPER_ADMIN, Role.ADMIN_CLIENT, Role.HR
}

# Roles that must request session approval from HR
MUST_REQUEST_SESSION_APPROVAL = {Role.MANAGER}

# Anti-cheat monitoring — Super Admin BMG ONLY
CAN_MONITOR_ANTICHEAT = {Role.SUPER_ADMIN}

# Roles that can deactivate accounts
CAN_DEACTIVATE_ACCOUNT = {
    Role.SUPER_ADMIN, Role.ADMIN_CLIENT, Role.HR
}

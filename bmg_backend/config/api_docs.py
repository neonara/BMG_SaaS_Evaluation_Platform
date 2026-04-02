"""
config/api_docs.py

API Documentation configuration using drf-spectacular (OpenAPI 3.1).

Why drf-spectacular over drf-yasg:
- Supports OpenAPI 3.1 (not 2.0)
- Actively maintained, supports DRF 3.15
- Generates correct schemas for nested serializers, enums, and JWT
- Supports @extend_schema for per-endpoint customisation

GraphQL documentation:
- GraphiQL is exposed at /graphql/ in DEBUG mode
- A static schema file is exported via: python manage.py export_schema

Add to requirements/dev.txt:
    drf-spectacular==0.27.*
    drf-spectacular[sidecar]==0.27.*  # includes Swagger UI + Redoc assets
"""
from __future__ import annotations

SPECTACULAR_SETTINGS = {
    "TITLE": "BMG SaaS Evaluation Platform — REST API",
    "DESCRIPTION": (
        "Multi-tenant SaaS platform for recruitment evaluation.\n\n"
        "## Authentication\n"
        "All endpoints (except `/api/public/` and `/api/health/`) require "
        "a JWT Bearer token obtained from `POST /api/auth/token/`.\n\n"
        "## Multi-tenancy\n"
        "The tenant is resolved from the `Host` header. "
        "Requests to `acme.bmg.tn` are scoped to the `acme_corp` PostgreSQL schema.\n\n"
        "## Anti-cheat monitoring\n"
        "Endpoints under `/api/attempts/*/flag/` are accessible by "
        "**Super Admin BMG only**. HR does not have access to anti-cheat data.\n\n"
        "## Rate limits\n"
        "See `X-RateLimit-Limit` and `X-RateLimit-Remaining` response headers."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],

    # ── Security ──────────────────────────────────────────────────────────────
    "SECURITY": [{"BearerAuth": []}],
    "SECURITY_DEFINITIONS": {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": (
                "JWT access token. Obtain from POST /api/auth/token/.\n"
                "Payload contains: user_id, role, tenant_schema, jti, exp."
            ),
        }
    },

    # ── Schema generation ─────────────────────────────────────────────────────
    "SCHEMA_PATH_PREFIX": "/api/",
    "SCHEMA_COERCE_PATH_PK_SUFFIX": True,
    "COMPONENT_SPLIT_REQUEST": True,      # separate request vs response schemas
    "ENUM_GENERATE_CHOICE_DESCRIPTION": True,

    # ── Tag grouping (shown in Swagger UI sidebar) ────────────────────────────
    "TAGS": [
        {"name": "auth",          "description": "JWT authentication, OTP, password reset"},
        {"name": "users",         "description": "User management, profiles, provisioning"},
        {"name": "tenants",       "description": "Tenant/organisation management (Super Admin)"},
        {"name": "tests",         "description": "Test model creation, versioning, questions"},
        {"name": "packs",         "description": "Pack management and public catalogue"},
        {"name": "sessions",      "description": "Session lifecycle, validation, assignment"},
        {"name": "attempts",      "description": "Test taking, anti-cheat, scoring"},
        {"name": "results",       "description": "Result reports, shareable links"},
        {"name": "payments",      "description": "Pack purchases, voucher activation, invoices"},
        {"name": "notifications", "description": "Notification preferences and history"},
        {"name": "audit",         "description": "Immutable audit log (Super Admin only)"},
        {"name": "health",        "description": "Health check"},
    ],

    # ── Postprocessing ────────────────────────────────────────────────────────
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
    ],

    # ── Swagger UI configuration ──────────────────────────────────────────────
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
        "filter": True,
        "docExpansion": "none",         # collapsed by default — 80+ endpoints
        "defaultModelsExpandDepth": 2,
    },

    # ── Redoc configuration ───────────────────────────────────────────────────
    "REDOC_UI_SETTINGS": {
        "hideDownloadButton": False,
        "expandResponses": "200,201",
    },
}

"""
Test settings.
Uses PostgreSQL (required by django-tenants — no SQLite support).
Celery tasks run eagerly (synchronously).
"""
from config.settings.base import *  # noqa: F401, F403
import os

DEBUG = True

# ── Test database — must be PostgreSQL for django-tenants ─────
# Uses the same DATABASE_URL as dev but with a _test suffix DB.
# pytest-django creates/drops the test database automatically.
# If DATABASE_URL is not set, fall back to localhost.
_test_db = DATABASES["default"].copy()  # noqa: F821
_test_db["TEST"] = {"NAME": os.environ.get("TEST_DATABASE_NAME", "bmg_test")}
DATABASES = {"default": _test_db}  # noqa: F821

# ── Fast passwords ────────────────────────────────────────────
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# ── Celery — run tasks synchronously in tests ─────────────────
CELERY_TASK_ALWAYS_EAGER    = True
CELERY_TASK_EAGER_PROPAGATES = True

# ── Local memory cache ────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ── Console email ────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ── No Cloudinary in tests ───────────────────────────────────
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# ── django-tenants test mode ──────────────────────────────────
# Use the base test runner which handles schema creation.
TENANT_CREATION_FAKES_MIGRATIONS = True

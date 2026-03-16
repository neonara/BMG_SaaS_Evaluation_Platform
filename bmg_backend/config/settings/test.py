"""
Test settings — fast, isolated, no external services.
Used by pytest via pytest.ini DJANGO_SETTINGS_MODULE.
"""
from config.settings.base import *  # noqa: F401, F403

DEBUG = True

# ── Use in-memory SQLite per test — faster than PostgreSQL ────────
# NOTE: django-tenants does NOT support SQLite.
# Tests that require schema isolation use a real PostgreSQL test DB.
# Unit tests (models, serializers, utils) can use SQLite.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "TEST": {"NAME": ":memory:"},
    }
}
# Override router — not needed without pg backend
DATABASE_ROUTERS = []

# ── Fast password hashing in tests ────────────────────────────────
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# ── Disable Celery — tasks run synchronously in tests ─────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ── Use local memory cache ────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# ── Suppress email ────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ── Disable Cloudinary ────────────────────────────────────────────
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

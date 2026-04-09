#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# BMG Backend entrypoint
# ═══════════════════════════════════════════════════════════════
set -e

echo "=== BMG startup ==="

# Create migrations for apps that don't have them yet
echo "--- makemigrations ---"
python manage.py makemigrations tenants      --noinput 2>/dev/null || true
python manage.py makemigrations users        --noinput 2>/dev/null || true
python manage.py makemigrations audit        --noinput 2>/dev/null || true
python manage.py makemigrations tests_module --noinput 2>/dev/null || true
python manage.py makemigrations packs        --noinput 2>/dev/null || true

# Run ALL shared migrations at once (public schema)
# This covers: contenttypes, auth, sessions, admin, tenants, celery_beat, etc.
echo "--- migrate_schemas --shared ---"
python manage.py migrate_schemas --shared --fake-initial --noinput

echo "--- migrate_schemas (tenant schemas) ---"
python manage.py migrate_schemas --noinput 2>/dev/null || true

# Apply users migrations directly to the public schema.
# apps.users is a TENANT app, so migrate_schemas --shared skips it.
# But in dev, localhost routes to the public schema, so its tables must exist there too.
echo "--- migrate users on public schema ---"
python manage.py migrate_schemas --schema=public --noinput 2>/dev/null || true

echo "--- collectstatic ---"
python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput

echo "=== Startup complete — launching: $@ ==="
exec "$@"

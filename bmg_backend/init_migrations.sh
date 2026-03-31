#!/bin/bash
set -e

echo "=== BMG startup: running migrations ==="

# Step 1 - Create migrations
echo "--- makemigrations ---"
python manage.py makemigrations tenants --noinput 2>/dev/null || true
python manage.py makemigrations users --noinput 2>/dev/null || true

# Step 2 - First create the tenants table (required for django-tenants)
echo "--- Creating tenants table first ---"
python manage.py migrate tenants --noinput

# Step 3 - Run remaining migrations in dependency order
echo "--- Running contenttypes (dependency for auth) ---"
python manage.py migrate contenttypes --noinput

echo "--- Running auth (dependency for admin and users) ---"
python manage.py migrate auth --noinput

echo "--- Running users (custom user model) ---"
python manage.py migrate users --noinput

echo "--- Running admin (depends on users) ---"
python manage.py migrate admin --noinput

echo "--- Running remaining apps ---"
python manage.py migrate --noinput

echo "=== Migrations done ==="

# Step 4 - Collect static files
echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Starting Gunicorn ==="
exec "$@"
#!/bin/sh
set -e

echo "=== BMG startup: running migrations ==="

# Ensure staticfiles directory exists and has correct permissions
mkdir -p /app/staticfiles
chmod 755 /app/staticfiles

# Create migrations if needed
echo "--- Creating migrations ---"
python manage.py makemigrations tenants --noinput 2>/dev/null || true
python manage.py makemigrations users --noinput 2>/dev/null || true

# First, create the tenants table (required for django-tenants to work)
echo "--- Creating tenants table ---"
python manage.py migrate tenants --noinput

# Run migrations in the correct dependency order using standard migrate
echo "--- Running contenttypes ---"
python manage.py migrate contenttypes --noinput

echo "--- Running auth ---"
python manage.py migrate auth --noinput

echo "--- Running users ---"
python manage.py migrate users --noinput

echo "--- Running admin ---"
python manage.py migrate admin --noinput

echo "--- Running remaining migrations ---"
python manage.py migrate --noinput

echo "=== Migrations done ==="

# Collect static files
echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Starting Gunicorn ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
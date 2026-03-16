# BMG SaaS Evaluation Platform — Backend

## Stack
Django 5.x · DRF · Graphene-Django · django-tenants · Celery · simplejwt

## Quick start (Docker)
```bash
cp .env.example .env.dev
docker compose --env-file .env.dev up -d
docker compose exec django_api python manage.py migrate_schemas --shared
docker compose exec django_api python manage.py createsuperuser
```

## ⚠️  Always use migrate_schemas, NOT migrate
django-tenants replaces Django's migrate command.
- `migrate_schemas --shared`  →  runs shared-app migrations on the public schema
- `migrate_schemas`           →  runs tenant-app migrations on every tenant schema
- `migrate_schemas --schema=acme_corp`  →  single tenant only

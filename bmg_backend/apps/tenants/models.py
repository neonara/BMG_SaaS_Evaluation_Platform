"""
TENANT and DOMAIN models (django-tenants). Lives in PUBLIC schema.
"""
from django.db import models

from django_tenants.models import TenantMixin, DomainMixin


class Tenant(TenantMixin):
    """One row per client organisation. django-tenants creates a PostgreSQL
    schema named after schema_name for this tenant automatically."""
    name = models.CharField(max_length=255)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1E3A8A")
    status = models.CharField(
        max_length=20,
        choices=[("active","Active"),("suspended","Suspended"),("trial","Trial")],
        default="trial",
    )
    created_on = models.DateField(auto_now_add=True)

    # django-tenants: auto create/drop schema on save/delete
    auto_create_schema = True
    auto_drop_schema = False   # Never auto-drop — manual only


class Domain(DomainMixin):
    """Maps a hostname (e.g. acme.bmg.tn) to a Tenant.
    Also used to detect internal candidates by email domain."""
    pass

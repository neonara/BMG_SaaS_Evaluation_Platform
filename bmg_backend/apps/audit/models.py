"""
apps/audit/models.py
AUDIT_LOG model — full implementation in Sprint 3.
Lives in the PUBLIC schema (SHARED_APPS).
"""
from django.db import models


class AuditLog(models.Model):
    """Placeholder — full fields added Sprint 3."""

    class Meta:
        db_table  = "audit_auditlog"
        app_label = "audit"

    def __str__(self) -> str:
        return "AuditLog"

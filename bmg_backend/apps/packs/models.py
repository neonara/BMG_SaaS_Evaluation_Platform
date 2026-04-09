"""
apps/packs/models.py
Pack, PackTest, Voucher, TenantPackAccess — Shared (public) schema.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone


def _voucher_code() -> str:
    """Generate a short uppercase code like BMG-A3F2-K9X1."""
    raw = secrets.token_hex(4).upper()
    return f"BMG-{raw[:4]}-{raw[4:]}"


class Pack(models.Model):
    STATUS_CHOICES = [
        ("active",    "Active"),
        ("inactive",  "Inactive"),
        ("archived",  "Archived"),
    ]
    CURRENCY_CHOICES = [
        ("TND", "Tunisian Dinar"),
        ("EUR", "Euro"),
        ("USD", "US Dollar"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="TND")
    max_candidates = models.PositiveIntegerField(default=0)
    validity_days = models.PositiveIntegerField(default=365)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "packs_pack"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.status})"


class PackTest(models.Model):
    """M2M through model: which tests belong to this pack."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pack = models.ForeignKey(Pack, on_delete=models.CASCADE, related_name="pack_tests")
    test = models.ForeignKey(
        "tests_module.TestModel",
        on_delete=models.CASCADE,
        related_name="pack_tests",
    )
    order = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "packs_packtest"
        unique_together = [("pack", "test")]
        ordering = ["order"]


class Voucher(models.Model):
    STATUS_CHOICES = [
        ("unused",   "Unused"),
        ("used",     "Used"),
        ("expired",  "Expired"),
        ("revoked",  "Revoked"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pack = models.ForeignKey(Pack, on_delete=models.CASCADE, related_name="vouchers")
    # Tenant these vouchers were generated for (UUID from shared Tenant model)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="vouchers",
    )
    code = models.CharField(max_length=20, unique=True, default=_voucher_code, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unused", db_index=True)
    expires_at = models.DateTimeField()
    redeemed_at = models.DateTimeField(null=True, blank=True)
    redeemed_by_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "packs_voucher"
        ordering = ["-created_at"]

    def is_valid(self) -> bool:
        return self.status == "unused" and self.expires_at > timezone.now()

    def redeem(self, user_email: str) -> "TenantPackAccess":
        if self.status == "used":
            raise ValueError("Voucher already used.")
        if self.status != "unused":
            raise ValueError(f"Voucher is {self.status}.")
        if self.expires_at <= timezone.now():
            self.status = "expired"
            self.save(update_fields=["status"])
            raise ValueError("Voucher has expired.")

        self.status = "used"
        self.redeemed_at = timezone.now()
        self.redeemed_by_email = user_email
        self.save(update_fields=["status", "redeemed_at", "redeemed_by_email"])

        access_expires = timezone.now() + timedelta(days=self.pack.validity_days)
        access, _ = TenantPackAccess.objects.get_or_create(
            tenant=self.tenant,
            pack=self.pack,
            defaults={"access_expires_at": access_expires},
        )
        # Extend expiry if already exists and new one is later
        if access.access_expires_at < access_expires:
            access.access_expires_at = access_expires
            access.save(update_fields=["access_expires_at"])
        return access


class TenantPackAccess(models.Model):
    """Records which tenant has active access to which pack."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="pack_access",
    )
    pack = models.ForeignKey(Pack, on_delete=models.CASCADE, related_name="tenant_access")
    access_expires_at = models.DateTimeField()
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "packs_tenantpackaccess"
        unique_together = [("tenant", "pack")]

    def is_active(self) -> bool:
        return self.access_expires_at > timezone.now()

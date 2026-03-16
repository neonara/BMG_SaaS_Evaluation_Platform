"""
Custom User model. Lives in TENANT schema. Includes OTP + dual-view logic.
"""
from django.db import models

import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from core.permissions.roles import Role


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=30,
        choices=[(r.value, r.value) for r in Role],
    )
    status = models.CharField(
        max_length=20,
        choices=[("active","Active"),("pending_otp","Pending OTP"),
                 ("deactivated","Deactivated")],
        default="pending_otp",
    )
    # Data export recovery (30-day link)
    personal_email = models.EmailField(blank=True)
    recovery_token = models.CharField(max_length=64, blank=True)
    recovery_expires_at = models.DateTimeField(null=True, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users_user"

    def __str__(self):
        return f"{self.email} ({self.role})"

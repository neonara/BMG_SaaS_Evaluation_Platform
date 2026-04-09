"""
Initial migration for the users app.
"""
from __future__ import annotations

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("first_name", models.CharField(max_length=150)),
                ("last_name", models.CharField(max_length=150)),
                ("role", models.CharField(
                    choices=[
                        ("super_admin", "super_admin"),
                        ("admin_client", "admin_client"),
                        ("hr", "hr"),
                        ("manager", "manager"),
                        ("internal_candidate", "internal_candidate"),
                        ("external_candidate", "external_candidate"),
                    ],
                    db_index=True, max_length=30,
                )),
                ("status", models.CharField(
                    choices=[
                        ("active", "Active"),
                        ("pending_otp", "Pending OTP"),
                        ("deactivated", "Deactivated"),
                    ],
                    db_index=True, default="pending_otp", max_length=20,
                )),
                ("personal_email", models.EmailField(blank=True, max_length=254)),
                ("recovery_token", models.CharField(blank=True, max_length=64)),
                ("recovery_expires_at", models.DateTimeField(blank=True, null=True)),
                ("deactivated_at", models.DateTimeField(blank=True, null=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("is_superuser", models.BooleanField(default=False)),
                ("date_joined", models.DateTimeField(auto_now_add=True)),
                ("groups", models.ManyToManyField(
                    blank=True,
                    help_text="The groups this user belongs to.",
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.group",
                    verbose_name="groups",
                )),
                ("user_permissions", models.ManyToManyField(
                    blank=True,
                    help_text="Specific permissions for this user.",
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.permission",
                    verbose_name="user permissions",
                )),
            ],
            options={
                "db_table": "users_user",
                "indexes": [
                    models.Index(fields=["role", "status"], name="users_user_role_status_idx"),
                ],
            },
            managers=[
                ("objects", models.Manager()),
            ],
        ),
    ]

"""
apps/users/signals.py

Signals for the users app.
Connected in UsersConfig.ready() — never at module level.

Rules:
- All model imports happen INSIDE handler functions to avoid circular imports.
- Every connection uses dispatch_uid to prevent duplicate registration
  when Django reloads modules (dev autoreload or Gunicorn preload).
- Handlers are lightweight. Heavy work goes to Celery tasks.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("bmg.users.signals")


def connect() -> None:
    """Called once from UsersConfig.ready()."""
    from django.db.models.signals import post_save, pre_save
    from apps.users.models import User

    pre_save.connect(
        _on_user_pre_save,
        sender=User,
        dispatch_uid="users.user.pre_save",
        weak=False,
    )
    post_save.connect(
        _on_user_post_save,
        sender=User,
        dispatch_uid="users.user.post_save",
        weak=False,
    )
    logger.debug("users signals connected")


# ── Handlers ──────────────────────────────────────────────────────────────────

def _on_user_pre_save(sender, instance, **kwargs) -> None:
    """
    Capture the old status BEFORE the save so post_save can compare.
    Avoids a second DB query in post_save.
    """
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


def _on_user_post_save(sender, instance, created: bool, **kwargs) -> None:
    from core.cache.keys import CacheKey
    from core.cache.service import invalidate, blacklist_all_user_tokens
    from django.db import connection

    schema = connection.schema_name
    ck = CacheKey(schema)

    if created:
        logger.info("User created email=%s role=%s", instance.email, instance.role)
        _send_welcome_notification(instance)
        return

    # Always invalidate the profile cache on any update
    invalidate(ck.user_profile(str(instance.pk)))

    # Deactivation: revoke all JWT tokens immediately
    old_status = getattr(instance, "_old_status", None)
    if old_status != "deactivated" and instance.status == "deactivated":
        blacklist_all_user_tokens(str(instance.pk))
        _send_deactivation_notification(instance)
        logger.info(
            "User deactivated — tokens revoked email=%s", instance.email
        )

    # Reactivation: send notification
    if old_status == "deactivated" and instance.status == "active":
        _send_reactivation_notification(instance)


def _send_welcome_notification(user) -> None:
    from apps.notifications.tasks import send_notification
    send_notification.delay(
        user_id=str(user.pk),
        notification_type="welcome",
        channel="email",
    )


def _send_deactivation_notification(user) -> None:
    from apps.notifications.tasks import send_notification
    send_notification.delay(
        user_id=str(user.pk),
        notification_type="account_deactivated",
        channel="email",
        payload={"recovery_link_days": 30},
    )


def _send_reactivation_notification(user) -> None:
    from apps.notifications.tasks import send_notification
    send_notification.delay(
        user_id=str(user.pk),
        notification_type="account_reactivated",
        channel="email",
    )

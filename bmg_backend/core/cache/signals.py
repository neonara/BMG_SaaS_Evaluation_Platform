"""
Cache invalidation signal handlers.

Each app's AppConfig.ready() method imports and calls the relevant
connect_*() function from here.

Example in apps/sessions_module/apps.py:

    class SessionsModuleConfig(AppConfig):
        def ready(self):
            from core.cache.signals import connect_session_signals
            connect_session_signals()

Handlers are defined here — not in each app — so the invalidation
logic stays in one place and is easy to audit.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("bmg.cache")


def connect_pack_signals() -> None:
    """Invalidate pack catalogue when SA creates/updates/deletes a pack."""
    from django.db.models.signals import post_delete, post_save
    from apps.packs.models import Pack
    from core.cache.keys import CacheKey
    from core.cache.service import invalidate, invalidate_pattern

    def _on_pack_change(sender, instance, **kwargs):
        invalidate_pattern(CacheKey.pack_catalogue_pattern())
        invalidate(CacheKey.pack_detail(str(instance.pk)))
        logger.info("Pack cache invalidated pk=%s", instance.pk)

    post_save.connect(_on_pack_change, sender=Pack, weak=False)
    post_delete.connect(_on_pack_change, sender=Pack, weak=False)


def connect_test_model_signals() -> None:
    """
    Test models are versioned: edits create NEW rows, never update existing ones.
    Old version cache entries can expire via TTL — no active invalidation needed.
    We only invalidate when a status changes on an existing row (e.g. → archived).
    """
    from django.db.models.signals import post_save
    from django.db import connection
    from apps.tests_module.models import TestModel
    from core.cache.keys import CacheKey
    from core.cache.service import invalidate

    def _on_test_model_save(sender, instance, created, **kwargs):
        if not created:
            ck = CacheKey(connection.schema_name)
            invalidate(ck.test_model(str(instance.pk)))
            invalidate(ck.test_questions(str(instance.pk)))

    post_save.connect(_on_test_model_save, sender=TestModel, weak=False)


def connect_session_signals() -> None:
    """Invalidate session list cache when any session status changes."""
    from django.db.models.signals import post_save
    from django.db import connection
    from apps.sessions_module.models import Session
    from core.cache.keys import CacheKey
    from core.cache.service import invalidate_pattern

    def _on_session_change(sender, instance, **kwargs):
        ck = CacheKey(connection.schema_name)
        invalidate_pattern(ck.session_pattern())

    post_save.connect(_on_session_change, sender=Session, weak=False)


def connect_user_signals() -> None:
    """
    On deactivation: invalidate user profile cache and blacklist all tokens.
    This is the critical path for account security.
    """
    from django.db.models.signals import post_save
    from django.db import connection
    from apps.users.models import User
    from core.cache.keys import CacheKey
    from core.cache.service import blacklist_all_user_tokens, invalidate

    def _on_user_save(sender, instance, created, **kwargs):
        if not created:
            ck = CacheKey(connection.schema_name)
            invalidate(ck.user_profile(str(instance.pk)))

            if instance.status == "deactivated":
                blacklist_all_user_tokens(str(instance.pk))
                logger.info(
                    "User deactivated — all tokens revoked user=%s", instance.pk
                )

    post_save.connect(_on_user_save, sender=User, weak=False)

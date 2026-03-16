"""
apps/tests_module/signals.py

Test models use immutable versioning:
  editing a model CREATES a new row (new pk) — it does NOT update in place.

Consequence: old version cache entries expire naturally via TTL.
We only need to invalidate when:
  1. A test model status changes (e.g. active → archived)
  2. A test model is deleted (should not happen, but guard anyway)

We do NOT connect post_save with created=True because new versions get
a new UUID — they will be cache misses on first access and populated then.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("bmg.tests.signals")


def connect() -> None:
    from django.db.models.signals import post_save
    from apps.tests_module.models import TestModel

    post_save.connect(
        _on_test_model_update,
        sender=TestModel,
        dispatch_uid="tests.testmodel.post_save",
        weak=False,
    )
    logger.debug("tests_module signals connected")


def _on_test_model_update(sender, instance, created: bool, **kwargs) -> None:
    if created:
        # New version — new UUID — will be a cache miss. Nothing to invalidate.
        return

    # Status or metadata change on existing row: invalidate this version's cache
    from core.cache.keys import CacheKey
    from core.cache.service import invalidate
    from django.db import connection

    ck = CacheKey(connection.schema_name)
    invalidate(ck.test_model(str(instance.pk)))
    invalidate(ck.test_questions(str(instance.pk)))
    logger.debug(
        "TestModel cache invalidated pk=%s status=%s", instance.pk, instance.status
    )

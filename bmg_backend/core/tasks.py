"""
core/tasks.py

Core Celery tasks that don't belong to any specific app.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger("bmg.core.tasks")

HEARTBEAT_KEY = "celery:beat:heartbeat"
HEARTBEAT_TTL = 600  # 10 minutes — if missing, Beat has been down for > 10 min


@shared_task(name="core.tasks.beat_heartbeat", ignore_result=True)
def beat_heartbeat() -> None:
    """
    Writes a timestamped key to Redis every 5 minutes.
    External monitoring (e.g. Prometheus + alertmanager) checks this key.
    If the key is missing or stale, an alert fires.
    """
    cache.set(
        HEARTBEAT_KEY,
        timezone.now().isoformat(),
        timeout=HEARTBEAT_TTL,
    )
    logger.debug("Beat heartbeat written at %s", timezone.now())

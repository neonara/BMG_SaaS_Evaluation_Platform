"""
apps/packs/signals.py
Invalidates the pack catalogue cache on pack save/delete.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("bmg.packs.signals")


def connect() -> None:
    from django.db.models.signals import post_delete, post_save

    from apps.packs.models import Pack

    post_save.connect(
        _on_pack_change,
        sender=Pack,
        dispatch_uid="packs.pack.post_save",
        weak=False,
    )
    post_delete.connect(
        _on_pack_change,
        sender=Pack,
        dispatch_uid="packs.pack.post_delete",
        weak=False,
    )
    logger.debug("packs signals connected")


def _on_pack_change(sender, instance, **kwargs) -> None:
    try:
        from django.core.cache import cache
        cache.delete(f"pack:catalogue")
        cache.delete(f"pack:{instance.pk}")
    except Exception:
        pass

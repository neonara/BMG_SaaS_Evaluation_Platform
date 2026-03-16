"""
Cache decorators for DRF ViewSet methods.

Usage:
    from core.cache.decorators import tenant_cache
    from core.cache.keys import CacheKey, CacheTTL

    class TestModelViewSet(viewsets.ReadOnlyModelViewSet):

        @tenant_cache(
            key_fn=lambda req, *a, **kw: CacheKey(req.tenant_schema).test_model(kw["pk"]),
            ttl=CacheTTL.TEST_MODEL,
        )
        def retrieve(self, request, *args, **kwargs):
            return super().retrieve(request, *args, **kwargs)
"""
from __future__ import annotations

import functools
import logging
from typing import Callable

from django.core.cache import cache

logger = logging.getLogger("bmg.cache")


def tenant_cache(key_fn: Callable, ttl: int):
    """
    Cache a DRF view method with tenant-isolated keys.

    key_fn(request, *args, **kwargs) → str
        Must include request.tenant_schema in the returned key.

    Only caches GET/HEAD — POST/PUT/PATCH/DELETE always bypass.
    Only caches HTTP 200 responses.
    """
    def decorator(view_method):
        @functools.wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            if request.method not in ("GET", "HEAD"):
                return view_method(self, request, *args, **kwargs)

            key = key_fn(request, *args, **kwargs)
            cached = cache.get(key)
            if cached is not None:
                logger.debug("CACHE HIT view key=%s", key)
                return cached

            response = view_method(self, request, *args, **kwargs)
            if hasattr(response, "status_code") and response.status_code == 200:
                cache.set(key, response, timeout=ttl)
                logger.debug("CACHE SET view key=%s ttl=%d", key, ttl)
            return response
        return wrapper
    return decorator

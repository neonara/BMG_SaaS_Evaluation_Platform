"""
Cache service — the single access point for all cache operations.

Rules:
  1. Views and serializers NEVER touch the cache directly.
     They call functions from this module.
  2. Invalidation is triggered by Django signals in signals.py,
     never inline in views.
  3. All keys come from CacheKey — never hardcode strings.
  4. Cache misses always fall through to the DB — never raise.

Pattern: Cache-aside (lazy population)
    value = cache.get(key)
    if value is None:
        value = expensive_db_query()
        cache.set(key, value, timeout=TTL)
    return value
"""
from __future__ import annotations

import logging
from typing import Any, Callable, TypeVar

from django.core.cache import cache

from core.cache.keys import CacheKey, CacheTTL

logger = logging.getLogger("bmg.cache")

T = TypeVar("T")


def get_or_set(key: str, loader: Callable[[], T], ttl: int) -> T:
    """
    Generic cache-aside helper.

    Args:
        key:    Cache key built via CacheKey
        loader: Callable that queries the DB on cache miss
        ttl:    Time-to-live in seconds from CacheTTL

    Returns:
        Cached or freshly loaded value.
    """
    value = cache.get(key)
    if value is not None:
        logger.debug("CACHE HIT  key=%s", key)
        return value  # type: ignore[return-value]

    logger.debug("CACHE MISS key=%s", key)
    value = loader()
    if value is not None:
        cache.set(key, value, timeout=ttl)
    return value  # type: ignore[return-value]


def invalidate(key: str) -> None:
    """Delete a single cache key."""
    cache.delete(key)
    logger.debug("CACHE DEL  key=%s", key)


def invalidate_pattern(pattern: str) -> None:
    """
    Delete all keys matching a Redis glob pattern.
    Uses SCAN — safe on large datasets, no KEYS command.
    Requires django-redis backend.

    Failures are swallowed — cache invalidation must never
    break a write operation.
    """
    try:
        cache.delete_pattern(pattern)  # type: ignore[attr-defined]
        logger.debug("CACHE DEL PATTERN %s", pattern)
    except Exception as exc:
        logger.warning("Cache pattern invalidation failed: %s  pattern=%s", exc, pattern)


# ── JWT blacklist ───────────────────────────────────────────────────

def blacklist_jwt(jti: str) -> None:
    """
    Add a JWT JTI to the Redis blacklist.
    TTL matches the refresh token lifetime so entries expire automatically.
    """
    cache.set(CacheKey.jwt_blacklist(jti), "1", timeout=CacheTTL.JWT_BLACKLIST)
    logger.debug("JWT BLACKLISTED jti=%s", jti)


def is_jwt_blacklisted(jti: str) -> bool:
    """
    Check if a JTI is blacklisted.
    Called on every authenticated request — must be sub-millisecond.
    Single Redis GET.
    """
    return cache.get(CacheKey.jwt_blacklist(jti)) is not None


def blacklist_all_user_tokens(user_id: str) -> None:
    """
    Blacklist every active JTI for a user.
    Called when an account is deactivated.
    """
    jti_set_key = CacheKey.jwt_user_tokens(user_id)
    jtis: set = cache.get(jti_set_key) or set()
    for jti in jtis:
        blacklist_jwt(jti)
    cache.delete(jti_set_key)
    logger.info(
        "All tokens blacklisted for user=%s count=%d", user_id, len(jtis)
    )


def register_user_token(user_id: str, jti: str) -> None:
    """
    Track a newly issued JTI for a user.
    Stored as a Redis set so we can revoke all tokens on deactivation.
    """
    jti_set_key = CacheKey.jwt_user_tokens(user_id)
    jtis: set = cache.get(jti_set_key) or set()
    jtis.add(jti)
    # TTL slightly longer than refresh token so the set doesn't expire
    # while tokens are still valid
    cache.set(jti_set_key, jtis, timeout=CacheTTL.JWT_BLACKLIST + 3_600)

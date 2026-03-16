"""
Centralised cache key definitions.
ALL cache keys in the entire project must be defined here.

Convention:
    {tenant_schema}:{module}:{object_type}:{id}[:{variant}]

The tenant_schema prefix is the multi-tenant isolation guarantee.
For shared (public schema) data, prefix is "public".

Never hardcode cache key strings anywhere else in the codebase.
Always import from here.
"""
from __future__ import annotations


class CacheKey:
    """
    Namespace class. Instantiate with a tenant schema to build
    tenant-scoped keys, or use staticmethods for public data.

    Usage:
        ck = CacheKey("acme_corp")
        key = ck.test_model(test_id)

        # Shared / public data (no instance needed):
        key = CacheKey.pack_catalogue()
    """

    def __init__(self, tenant_schema: str) -> None:
        self._schema = tenant_schema

    # ── Tenant-scoped keys ──────────────────────────────────────────

    def user_profile(self, user_id: str) -> str:
        return f"{self._schema}:users:profile:{user_id}"

    def user_profile_pattern(self) -> str:
        return f"{self._schema}:users:profile:*"

    def test_model(self, test_id: str) -> str:
        return f"{self._schema}:tests:model:{test_id}"

    def test_questions(self, test_id: str) -> str:
        """Ordered question list for a test model version."""
        return f"{self._schema}:tests:questions:{test_id}"

    def test_model_pattern(self) -> str:
        return f"{self._schema}:tests:*"

    def session_list(self, role: str) -> str:
        """Session list keyed per role: rh | manager | admin."""
        return f"{self._schema}:sessions:list:{role}"

    def session_detail(self, session_id: str) -> str:
        return f"{self._schema}:sessions:detail:{session_id}"

    def session_pattern(self) -> str:
        return f"{self._schema}:sessions:*"

    def attempt_result(self, attempt_id: str) -> str:
        """Immutable once submitted."""
        return f"{self._schema}:results:attempt:{attempt_id}"

    def shareable_report(self, token: str) -> str:
        """Public shareable report lookup by token."""
        return f"{self._schema}:results:shareable:{token}"

    def results_pattern(self) -> str:
        return f"{self._schema}:results:*"

    # ── Public / shared schema keys ─────────────────────────────────

    @staticmethod
    def pack_catalogue() -> str:
        """Full active pack list — served to Vitrine and external candidates."""
        return "public:packs:catalogue:active"

    @staticmethod
    def pack_catalogue_pattern() -> str:
        return "public:packs:catalogue:*"

    @staticmethod
    def pack_detail(pack_id: str) -> str:
        return f"public:packs:detail:{pack_id}"

    @staticmethod
    def voucher_status(code: str) -> str:
        """Voucher status — invalidated on activation."""
        return f"public:vouchers:status:{code}"

    # ── JWT blacklist ────────────────────────────────────────────────

    @staticmethod
    def jwt_blacklist(jti: str) -> str:
        """Blacklisted JWT token. TTL = refresh token lifetime (7 days)."""
        return f"jwt:blacklist:{jti}"

    @staticmethod
    def jwt_user_tokens(user_id: str) -> str:
        """Set of active JTIs for a user — blacklist all on deactivation."""
        return f"jwt:user_tokens:{user_id}"


class CacheTTL:
    """All TTL values in seconds. Single source of truth."""
    PACK_CATALOGUE   = 300        # 5 min  — SA edits packs rarely
    TEST_MODEL       = 3_600      # 1 h    — versioned; old versions never mutate
    TEST_QUESTIONS   = 3_600      # 1 h    — same lifecycle as test model
    USER_PROFILE     = 300        # 5 min  — user can be deactivated at any time
    SESSION_LIST     = 60         # 1 min  — changes on validation/cancellation
    SESSION_DETAIL   = 120        # 2 min
    ATTEMPT_RESULT   = 86_400     # 24 h   — immutable once submitted
    SHAREABLE_REPORT = 3_600      # 1 h
    VOUCHER_STATUS   = 120        # 2 min
    PACK_DETAIL      = 600        # 10 min
    JWT_BLACKLIST    = 604_800    # 7 days — must outlive the refresh token

"""
Throttle settings — imported by base.py.
Kept separate so they can be reviewed and tuned independently.

All rates follow Django REST Framework format: "{count}/{period}"
Periods: second, minute, hour, day
None = no throttling (exempt endpoint)
"""

REST_FRAMEWORK_THROTTLE_CLASSES = [
    # Role-based (only the matching role activates)
    "core.throttling.SuperAdminThrottle",
    "core.throttling.AdminClientThrottle",
    "core.throttling.HRThrottle",
    "core.throttling.ManagerThrottle",
    "core.throttling.InternalCandidateThrottle",
    "core.throttling.ExternalCandidateThrottle",
    # Anonymous fallback
    "rest_framework.throttling.AnonRateThrottle",
]

DEFAULT_THROTTLE_RATES = {
    # ── Auth endpoints ────────────────────────────────────────────────────────
    # 5 login attempts per minute per (IP + email).
    # After 5 failures the user must wait 60 seconds.
    "login":          "5/min",

    # Password reset: 3 requests per hour per IP
    "password_reset": "3/hour",

    # OTP verification: 5 attempts per minute per IP
    "otp_verify":     "5/min",

    # ── Role-based API access ─────────────────────────────────────────────────
    # Super Admin BMG: high limit for bulk operations
    # (CSV imports, publishing 50 test models at once, etc.)
    "super_admin":          "1000/min",

    # Admin Client: manages one org, moderate volume
    "admin_client":         "300/min",

    # HR / Recruiter: session management, results viewing
    "hr":                   "200/min",

    # Manager: session requests, team results
    "manager":              "120/min",

    # Internal candidate: test-taking + profile access
    # (test_taking endpoints are EXEMPT — see below)
    "internal_candidate":   "60/min",

    # External candidate: pack browsing + test taking
    "external_candidate":   "60/min",

    # Anonymous: Vitrine visitors, unauthenticated pack catalogue
    "anon":                 "120/min",
    "anon_public":          "120/min",

    # ── Special endpoints ─────────────────────────────────────────────────────
    # Test taking: ALWAYS ALLOWED — never block a candidate mid-test
    # The throttle class tracks usage but allow_request() always returns True
    "test_taking":          None,

    # Webhooks: IP-whitelisted at Nginx level, throttle is fallback only
    "webhook":              "500/min",

    # Data export: 2 requests per hour (triggers heavy PDF+CSV generation)
    "export_request":       "2/hour",
}

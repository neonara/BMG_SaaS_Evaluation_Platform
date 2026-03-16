"""
config/celery_beat_schedule.py

Celery Beat periodic task schedule.

Two tiers of tasks:

TIER 1 — CODE-DEFINED (CELERY_BEAT_SCHEDULE in settings):
    Tasks that MUST always run and must not be accidentally disabled
    via the Celery Beat admin UI. Defined in code, not in the DB.
    - Heartbeat (monitoring)
    - Cleanup tasks (GDPR, expired tokens, expired links)
    - Session auto-close

TIER 2 — DB-DEFINED (django_celery_beat):
    Business tasks where timing may need adjustment without a deploy.
    These are created via a data migration and can be tweaked in the
    Celery Beat admin at /bmg-admin/django_celery_beat/periodictask/.
    - Deadline reminders (BMG may want to change from D-2 to D-1)
    - Audit log rotation (BMG may want to adjust retention period)

Import this module in base.py:
    from config.celery_beat_schedule import CELERY_BEAT_SCHEDULE
"""
from __future__ import annotations

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE: dict = {

    # ── TIER 1: Always-on system tasks ────────────────────────────────────────

    "beat-heartbeat": {
        # Writes a Redis key every 5 minutes.
        # External monitoring checks this key — if missing, Beat is down.
        "task": "core.tasks.beat_heartbeat",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "default", "expires": 240},
    },

    "cleanup-expired-recovery-links": {
        # Nullify recovery_token for users where recovery_expires_at < now.
        # Runs every hour — links expire after 30 days but we clean hourly
        # to avoid accumulating stale tokens.
        "task": "apps.users.tasks.cleanup_expired_recovery_links",
        "schedule": crontab(minute=0),              # every hour at :00
        "options": {"queue": "default", "expires": 3300},
    },

    "purge-deactivated-user-data": {
        # GDPR: hard-delete personal data (name, email, etc.) for users
        # deactivated more than 30 days ago. Keeps anonymised score data.
        # Runs daily at 02:00 Africa/Tunis (low-traffic window).
        "task": "apps.users.tasks.purge_deactivated_user_data",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "default", "expires": 82800},   # 23h
    },

    "session-auto-close": {
        # Set status = 'closed' for sessions where closing_date < now.
        # Runs every hour so sessions close within 1h of their closing_date.
        "task": "apps.sessions_module.tasks.auto_close_expired_sessions",
        "schedule": crontab(minute=15),             # every hour at :15
        "options": {"queue": "default", "expires": 3300},
    },

    "cleanup-expired-shareable-reports": {
        # Delete SHAREABLE_REPORT rows where expires_at < now AND
        # expires_at IS NOT NULL (permanent reports are kept).
        "task": "apps.results.tasks.cleanup_expired_shareable_reports",
        "schedule": crontab(hour=3, minute=0),      # daily 03:00
        "options": {"queue": "default", "expires": 82800},
    },

    "cleanup-expired-vouchers": {
        # Mark VOUCHER rows as 'expired' where expires_at < now
        # and status = 'unused'. Does not delete — preserves audit trail.
        "task": "apps.packs.tasks.cleanup_expired_vouchers",
        "schedule": crontab(hour=4, minute=0),      # daily 04:00
        "options": {"queue": "default", "expires": 82800},
    },

    # ── TIER 2: Business tasks (also defined here as code fallback) ───────────
    # These are also created by a data migration in django_celery_beat
    # so BMG can adjust timing via the admin UI. The code definition
    # here is a fallback in case the DB entry is accidentally deleted.

    "session-deadline-reminder-d2": {
        # Find all SESSION_ASSIGNMENTs where session.deadline = today + 2 days
        # and status = 'assigned'. Send a reminder notification to each candidate.
        "task": "apps.sessions_module.tasks.send_deadline_reminders",
        "schedule": crontab(hour=9, minute=0),      # daily 09:00
        "options": {"queue": "notif", "expires": 82800},
        "kwargs": {"days_before": 2},
    },

    "session-deadline-reminder-d1": {
        # Same but for tomorrow's deadline — more urgent reminder.
        "task": "apps.sessions_module.tasks.send_deadline_reminders",
        "schedule": crontab(hour=9, minute=30),     # daily 09:30
        "options": {"queue": "notif", "expires": 82800},
        "kwargs": {"days_before": 1},
    },
}

"""
Tasks for this app — implemented in the relevant sprint.
Stubs registered here to prevent Celery beat errors.
"""
from celery import shared_task


@shared_task(name=f"apps.{__name__.split('.')[1]}.tasks.auto_close_expired_sessions", ignore_result=True)
def auto_close_expired_sessions(**kwargs):
    pass  # Implemented in Sprint 3


@shared_task(name=f"apps.{__name__.split('.')[1]}.tasks.cleanup_expired_shareable_reports", ignore_result=True)
def cleanup_expired_shareable_reports(**kwargs):
    pass  # Implemented in Sprint 5


@shared_task(name=f"apps.{__name__.split('.')[1]}.tasks.cleanup_expired_vouchers", ignore_result=True)
def cleanup_expired_vouchers(**kwargs):
    pass  # Implemented in Sprint 2


@shared_task(name=f"apps.{__name__.split('.')[1]}.tasks.send_deadline_reminders", **{"ignore_result": True})
def send_deadline_reminders(**kwargs):
    pass  # Implemented in Sprint 3

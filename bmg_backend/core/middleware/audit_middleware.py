"""
Audit middleware — logs sensitive write operations to AUDIT_LOG.
Only logs POST/PUT/PATCH/DELETE on /api/ endpoints.
"""
import json
import logging

logger = logging.getLogger("bmg.audit")

SENSITIVE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.method in SENSITIVE_METHODS
            and request.path.startswith("/api/")
            and hasattr(request, "user")
            and request.user.is_authenticated
        ):
            self._log(request, response)
        return response

    def _log(self, request, response):
        logger.info(
            "AUDIT method=%s path=%s user=%s status=%s",
            request.method,
            request.path,
            request.user.pk,
            response.status_code,
        )
        # Async: send to AUDIT_LOG table via Celery
        from apps.audit.tasks import create_audit_log
        create_audit_log.delay(
            actor_id=str(request.user.pk),
            action=f"{request.method} {request.path}",
            status_code=response.status_code,
        )

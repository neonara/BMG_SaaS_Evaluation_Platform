from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.core.cache import cache


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        checks = {}
        # DB
        try:
            with connection.cursor() as c:
                c.execute("SELECT 1")
            checks["db"] = "ok"
        except Exception as e:
            checks["db"] = f"error: {e}"
        # Cache
        try:
            cache.set("health", "ok", 5)
            checks["cache"] = "ok" if cache.get("health") == "ok" else "miss"
        except Exception as e:
            checks["cache"] = f"error: {e}"

        ok = all(v == "ok" for v in checks.values())
        return Response({"status": "ok" if ok else "degraded", **checks},
                        status=200 if ok else 503)

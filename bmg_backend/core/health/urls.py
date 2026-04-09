from django.urls import path
from .views import HealthCheckView

urlpatterns = [
    path("", HealthCheckView, name="health_check"),
]

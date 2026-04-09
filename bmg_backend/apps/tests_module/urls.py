from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tests_module.views import TestViewSet

router = DefaultRouter()
router.register("", TestViewSet, basename="test")

urlpatterns = [path("", include(router.urls))]

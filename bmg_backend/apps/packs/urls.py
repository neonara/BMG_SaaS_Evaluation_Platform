from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.packs.views import PackViewSet

router = DefaultRouter()
router.register("", PackViewSet, basename="pack")

urlpatterns = [path("", include(router.urls))]

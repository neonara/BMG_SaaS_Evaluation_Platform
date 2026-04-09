from django.urls import path

from apps.packs.views import PublicPackListView

urlpatterns = [
    path("", PublicPackListView.as_view(), name="public-pack-list"),
]

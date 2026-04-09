"""apps/users/urls/auth_token.py"""
from django.urls import path
from apps.users.views import CustomTokenObtainPairView

urlpatterns = [
    path("", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
]

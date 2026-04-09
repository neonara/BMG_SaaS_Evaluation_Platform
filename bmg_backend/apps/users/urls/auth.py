"""apps/users/urls/auth.py"""
from django.urls import path
from apps.users.views import (
    LogoutView,
    OTPVerifyView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterExternalSendOTPView,
    RegisterExternalView,
    RegisterInternalView,
)

urlpatterns = [
    path("logout/",                  LogoutView.as_view(),               name="auth-logout"),
    path("register/send-otp/",       RegisterExternalSendOTPView.as_view(), name="auth-register-send-otp"),
    path("register/",                RegisterExternalView.as_view(),     name="auth-register-external"),
    path("register/internal/",       RegisterInternalView.as_view(),     name="auth-register-internal"),
    path("otp/verify/",              OTPVerifyView.as_view(),            name="auth-otp-verify"),
    path("password/reset/",          PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("password/reset/confirm/",  PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]

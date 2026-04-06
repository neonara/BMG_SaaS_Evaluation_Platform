"""
apps/social_accounts/views.py
"""
from __future__ import annotations

import secrets
import urllib.parse
from typing import Any

import httpx
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from core.permissions.roles import Role
from .models import SocialAccount
from .serializers import OAuthCallbackSerializer, SocialLoginResponseSerializer


def _google_config() -> dict:
    return {
        "client_id":     settings.SOCIAL_AUTH_GOOGLE_CLIENT_ID,
        "client_secret": settings.SOCIAL_AUTH_GOOGLE_CLIENT_SECRET,
        "auth_url":      "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url":     "https://oauth2.googleapis.com/token",
        "userinfo_url":  "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope":         "openid email profile",
        "redirect_uri":  settings.SOCIAL_AUTH_GOOGLE_REDIRECT_URI,
    }


def _linkedin_config() -> dict:
    return {
        "client_id":     settings.SOCIAL_AUTH_LINKEDIN_CLIENT_ID,
        "client_secret": settings.SOCIAL_AUTH_LINKEDIN_CLIENT_SECRET,
        "auth_url":      "https://www.linkedin.com/oauth/v2/authorization",
        "token_url":     "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url":  "https://api.linkedin.com/v2/userinfo",
        "scope":         "openid profile email",
        "redirect_uri":  settings.SOCIAL_AUTH_LINKEDIN_REDIRECT_URI,
    }


PROVIDER_CONFIGS: dict[str, Any] = {
    SocialAccount.PROVIDER_GOOGLE:   _google_config,
    SocialAccount.PROVIDER_LINKEDIN: _linkedin_config,
}


def _get_config(provider: str) -> dict:
    factory = PROVIDER_CONFIGS.get(provider)
    if not factory:
        raise ValueError(f"Unknown provider: {provider}")
    return factory()


def _build_auth_url(provider: str) -> tuple[str, str]:
    cfg = _get_config(provider)
    state = secrets.token_urlsafe(32)
    params = {
        "client_id":     cfg["client_id"],
        "redirect_uri":  cfg["redirect_uri"],
        "response_type": "code",
        "scope":         cfg["scope"],
        "state":         state,
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    url = cfg["auth_url"] + "?" + urllib.parse.urlencode(params)
    return url, state


def _exchange_code(provider: str, code: str) -> dict:
    cfg = _get_config(provider)
    resp = httpx.post(
        cfg["token_url"],
        data={
            "grant_type":   "authorization_code",
            "code":         code,
            "redirect_uri": cfg["redirect_uri"],
            "client_id":    cfg["client_id"],
            "client_secret": cfg["client_secret"],
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _fetch_userinfo(provider: str, access_token: str) -> dict:
    cfg = _get_config(provider)
    resp = httpx.get(
        cfg["userinfo_url"],
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _get_or_create_user(provider: str, userinfo: dict, token_data: dict) -> tuple[User, bool]:
    uid = str(userinfo.get("sub") or userinfo.get("id"))
    email = userinfo.get("email", "").lower()

    with transaction.atomic():
        try:
            sa = SocialAccount.objects.select_related("user").get(provider=provider, uid=uid)
            sa.update_tokens(
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token", ""),
                expires_in=token_data.get("expires_in"),
            )
            sa.extra_data = userinfo
            sa.save(update_fields=["extra_data", "updated_at"])
            return sa.user, False
        except SocialAccount.DoesNotExist:
            pass

        is_new = False
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            name = userinfo.get("given_name") or userinfo.get("name") or ""
            user = User.objects.create_user(
                email=email,
                password=None,
                first_name=name.split()[0] if name else "",
                last_name=userinfo.get("family_name", ""),
                role=Role.EXTERNAL_CANDIDATE.value,
                status="active",
            )
            is_new = True

        SocialAccount.objects.create(
            user=user,
            provider=provider,
            uid=uid,
            access_token=token_data.get("access_token", ""),
            refresh_token=token_data.get("refresh_token", ""),
            extra_data=userinfo,
        )
        return user, is_new


def _jwt_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class SocialLoginInitView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request, provider: str) -> Response:
        provider = provider.lower()
        if provider not in PROVIDER_CONFIGS:
            return Response(
                {"error": f"Provider '{provider}' is not supported. Use: google, linkedin"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            auth_url, state = _build_auth_url(provider)
        except AttributeError:
            return Response(
                {"error": f"Provider '{provider}' is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        request.session[f"oauth_state_{provider}"] = state
        return Response({"auth_url": auth_url, "state": state})


class SocialCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request, provider: str) -> Response:
        provider = provider.lower()
        if provider not in PROVIDER_CONFIGS:
            return Response(
                {"error": f"Unknown provider '{provider}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OAuthCallbackSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data["code"]
        state = serializer.validated_data["state"]

        expected_state = request.session.get(f"oauth_state_{provider}", "")
        if expected_state and state and expected_state != state:
            return Response(
                {"error": "Invalid OAuth state. Possible CSRF attack."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_data = _exchange_code(provider, code)
            userinfo = _fetch_userinfo(provider, token_data["access_token"])
            user, is_new = _get_or_create_user(provider, userinfo, token_data)
        except httpx.HTTPStatusError as e:
            return Response(
                {"error": f"OAuth provider error: {e.response.status_code}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except httpx.RequestError:
            return Response(
                {"error": "Cannot reach OAuth provider. Try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if user.status == "deactivated":
            return Response(
                {"error": "This account has been deactivated."},
                status=status.HTTP_403_FORBIDDEN,
            )

        jwt = _jwt_for_user(user)
        response_data = {
            **jwt,
            "user_id": user.id,
            "email": user.email,
            "is_new_account": is_new,
        }
        out = SocialLoginResponseSerializer(data=response_data)
        out.is_valid()
        return Response(out.data, status=status.HTTP_200_OK)


class SocialAccountListView(APIView):
    def get(self, request: Request) -> Response:
        from .serializers import SocialAccountSerializer
        accounts = SocialAccount.objects.filter(user=request.user)
        return Response(SocialAccountSerializer(accounts, many=True).data)


class SocialAccountDisconnectView(APIView):
    def delete(self, request: Request, provider: str) -> Response:
        provider = provider.lower()
        user = request.user

        if not user.has_usable_password():
            count = SocialAccount.objects.filter(user=user).count()
            if count <= 1:
                return Response(
                    {"error": "Cannot unlink your only login method. Set a password first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        deleted, _ = SocialAccount.objects.filter(user=user, provider=provider).delete()
        if not deleted:
            return Response(
                {"error": f"No {provider} account linked."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

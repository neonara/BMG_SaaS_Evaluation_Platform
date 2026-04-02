"""apps/users/views.py"""
from __future__ import annotations

import secrets
from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.models import User
from apps.users.serializers import (
    CustomTokenObtainPairSerializer,
    DeactivateSerializer,
    ExportRequestSerializer,
    InviteSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterExternalSerializer,
    RegisterInternalSerializer,
    UserAdminSerializer,
    UserAdminUpdateSerializer,
    UserCreateSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserPublicSerializer,
)
from core.permissions.permissions import IsAdminClient, IsHR, IsSuperAdmin
from core.permissions.roles import Role
from core.throttling import (
    ExportRequestThrottle,
    LoginThrottle,
    OTPVerifyThrottle,
    PasswordResetThrottle,
)


# ── Auth views ───────────────────────────────────────────────────────────────

@extend_schema(tags=["Auth"])
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/token/
    Returns 200 with token pair for active users.
    Returns 202 for internal candidates with status=pending_otp.
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            email = request.data.get("email", "")
            try:
                user = User.objects.get(email=email)
                if user.status == "pending_otp":
                    return Response(
                        {
                            "detail": f"OTP sent to {email}. Please verify to complete login.",
                            "requires_otp": True,
                        },
                        status=status.HTTP_202_ACCEPTED,
                    )
            except User.DoesNotExist:
                pass
            raise
        return Response(serializer.validated_data)


@extend_schema(
    tags=["Auth"],
    summary="Logout",
    description="Blacklists the current JWT refresh token, invalidating the session.",
    request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}},
    responses={
        204: OpenApiResponse(description="Logged out successfully."),
        400: OpenApiResponse(description="Missing or invalid refresh token."),
    },
)
class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        from core.cache.service import blacklist_jwt

        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            blacklist_jwt(token["jti"])
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Auth"],
    summary="Register external candidate",
    description="B2C self-registration. Creates an active account immediately.",
    responses={
        201: UserPublicSerializer,
        400: OpenApiResponse(description="Validation error."),
    },
)
class RegisterExternalView(APIView):
    """POST /api/auth/register/ — B2C external candidate registration."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterExternalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from apps.notifications.tasks import send_notification
        send_notification.delay(
            user_id=str(user.pk),
            notification_type="welcome",
            channel="email",
        )
        return Response(UserPublicSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Auth"],
    summary="Register internal candidate",
    description="Auto-detects tenant from email domain. Sends OTP to activate account.",
    responses={
        201: OpenApiResponse(description="OTP sent — account pending verification."),
        404: OpenApiResponse(description="No organisation found for this email domain."),
    },
)
class RegisterInternalView(APIView):
    """POST /api/auth/register/internal/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterInternalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        from apps.tenants.models import Domain
        tenant = Domain.get_tenant_by_email_domain(email)
        if tenant is None:
            return Response(
                {"error": True, "status_code": 404,
                 "detail": f"No organisation found for domain {email.split('@')[-1]}."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = User.objects.create_user(
            email=email,
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            role=Role.INTERNAL_CANDIDATE,
            status="pending_otp",
        )

        from apps.users.otp import generate_and_store
        otp_code = generate_and_store(email)
        from apps.users.tasks import send_otp_email
        send_otp_email.delay(user_id=str(user.pk), otp_code=otp_code)

        return Response(
            {
                "detail": f"OTP sent to {email}. Please verify to activate your account.",
                "requires_otp": True,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Auth"],
    summary="Verify OTP",
    description="Verifies the OTP code. Activates the account and returns a token pair.",
    responses={
        200: OpenApiResponse(description="Account activated — token pair returned."),
        400: OpenApiResponse(description="Invalid or expired OTP."),
    },
)
class OTPVerifyView(APIView):
    """POST /api/auth/otp/verify/"""
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["otp_code"]

        from apps.users.otp import generate_and_store, verify
        if not verify(email, code):
            try:
                user = User.objects.get(email=email, status="pending_otp")
                new_code = generate_and_store(email)
                from apps.users.tasks import send_otp_email
                send_otp_email.delay(user_id=str(user.pk), otp_code=new_code)
                detail = "OTP has expired. A new code has been sent."
            except User.DoesNotExist:
                detail = "Invalid OTP code."
            return Response(
                {"error": True, "status_code": 400, "detail": detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email, status="pending_otp")
        except User.DoesNotExist:
            return Response(
                {"error": True, "status_code": 400, "detail": "Invalid OTP code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.status = "active"
        user.save(update_fields=["status"])

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        from core.cache.service import register_user_token
        register_user_token(str(user.pk), str(refresh["jti"]))

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


@extend_schema(
    tags=["Auth"],
    summary="Request password reset",
    description="Always returns 200 to prevent email enumeration.",
    responses={200: OpenApiResponse(description="Reset link sent if account exists.")},
)
class PasswordResetRequestView(APIView):
    """POST /api/auth/password/reset/"""
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        try:
            user = User.objects.get(email=email, status="active")
            from apps.users.tasks import send_password_reset_email
            send_password_reset_email.delay(user_id=str(user.pk))
        except User.DoesNotExist:
            pass
        return Response(
            {"detail": "If an account exists, a reset link has been sent."}
        )


@extend_schema(
    tags=["Auth"],
    summary="Confirm password reset",
    description="Validates the reset token and sets the new password.",
    responses={
        200: OpenApiResponse(description="Password reset successfully."),
        400: OpenApiResponse(description="Invalid or expired token."),
    },
)
class PasswordResetConfirmView(APIView):
    """POST /api/auth/password/reset/confirm/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        from django.core.cache import cache
        user_id = cache.get(f"pwd_reset:{token}")
        if not user_id:
            return Response(
                {"error": True, "status_code": 400,
                 "detail": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": True, "status_code": 400,
                 "detail": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(f"pwd_reset:{token}")

        from core.cache.service import blacklist_all_user_tokens
        blacklist_all_user_tokens(str(user.pk))

        return Response({"detail": "Password has been reset. Please log in again."})


# ── User views ───────────────────────────────────────────────────────────────

@extend_schema(tags=["Users"])
class MeView(APIView):
    """GET/PATCH /api/v1/users/me/ — own profile."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get own profile", responses={200: UserProfileSerializer})
    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    @extend_schema(
        summary="Update own profile",
        request=UserProfileUpdateSerializer,
        responses={200: UserProfileSerializer},
    )
    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data)


@extend_schema(tags=["Users"])
@extend_schema_view(
    list=extend_schema(summary="List users"),
    create=extend_schema(summary="Create user"),
    retrieve=extend_schema(summary="Get user"),
    partial_update=extend_schema(summary="Update user"),
)
class UserViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filter_fields = ["role", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.all()
        if user.role == Role.MANAGER:
            return qs.none()
        return qs.order_by("email")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("partial_update", "update"):
            return UserAdminUpdateSerializer
        return UserAdminSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsHR()]
        if self.action in ("partial_update", "update", "deactivate", "reactivate"):
            return [IsHR()]
        if self.action == "export_data":
            return [IsAuthenticated()]
        if self.action in ("provision_csv", "provision_invite"):
            return [IsAdminClient()]
        return [IsHR()]

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @extend_schema(summary="Deactivate user", responses={200: UserAdminSerializer})
    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        user = self.get_object()
        serializer = DeactivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if user.status == "deactivated":
            return Response(
                {"detail": "User is already deactivated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.deactivate()
        return Response(UserAdminSerializer(user).data)

    @extend_schema(summary="Reactivate user", responses={200: UserAdminSerializer})
    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        user = self.get_object()
        if user.status != "deactivated":
            return Response(
                {"detail": "User is not deactivated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.reactivate()
        return Response(UserAdminSerializer(user).data)

    @extend_schema(
        summary="Request data export",
        responses={202: OpenApiResponse(description="Export queued.")},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="export",
        throttle_classes=[ExportRequestThrottle],
    )
    def export_data(self, request, pk=None):
        user = self.get_object()
        if request.user.pk != user.pk and not IsHR().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = ExportRequestSerializer(
            data=request.data,
            context={"target_user": user},
        )
        serializer.is_valid(raise_exception=True)
        delivery_email = serializer.validated_data.get("personal_email") or user.personal_email

        token = secrets.token_urlsafe(32)
        user.recovery_token = token
        user.recovery_expires_at = timezone.now() + timedelta(days=30)
        if delivery_email:
            user.personal_email = delivery_email
        user.save(update_fields=["recovery_token", "recovery_expires_at", "personal_email"])

        from apps.users.tasks import generate_data_export
        generate_data_export.delay(user_id=str(user.pk))

        return Response(
            {"detail": f"Export queued. Download link sent to {delivery_email}."},
            status=status.HTTP_202_ACCEPTED,
        )

    @extend_schema(
        summary="Provision users from CSV",
        responses={202: OpenApiResponse(description="CSV queued for processing.")},
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="provision/csv",
        permission_classes=[IsAdminClient],
    )
    def provision_csv(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "File too large. Maximum 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        send_invitations = request.data.get("send_invitations", True)
        from apps.users.tasks import import_users_from_csv
        task = import_users_from_csv.delay(
            csv_content=uploaded_file.read().decode("utf-8"),
            send_invitations=bool(send_invitations),
        )
        return Response(
            {"task_id": task.id, "detail": "CSV queued for processing."},
            status=status.HTTP_202_ACCEPTED,
        )

    @extend_schema(
        summary="Send invitation emails",
        responses={202: OpenApiResponse(description="Invitations sent.")},
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="provision/invite",
        permission_classes=[IsHR],
    )
    def provision_invite(self, request):
        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitations = serializer.validated_data["invitations"]

        from apps.users.tasks import send_invitation_email
        for inv in invitations:
            send_invitation_email.delay(
                email=inv["email"],
                role=inv["role"],
            )

        return Response(
            {
                "invited": len(invitations),
                "detail": f"{len(invitations)} invitation(s) sent.",
            },
            status=status.HTTP_202_ACCEPTED,
        )
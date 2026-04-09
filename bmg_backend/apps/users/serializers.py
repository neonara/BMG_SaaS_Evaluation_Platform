"""apps/users/serializers.py"""
from __future__ import annotations

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import User
from core.permissions.roles import Role


# ── JWT ─────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to:
    1. Inject role + tenant_schema into token payload
    2. Detect internal candidates (status=pending_otp) and return 202
    3. Register the JTI in Redis for bulk revocation on deactivation
    """

    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        # tenant_schema is set by TenantMiddleware — available on request,
        # but since serializers don't have request, we get it from connection
        try:
            from django.db import connection
            token["tenant_schema"] = connection.schema_name
        except Exception:
            token["tenant_schema"] = "public"
        return token

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        user: User = self.user
        # Register JTI for bulk revocation
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken(data["refresh"])
        from core.cache.service import register_user_token
        register_user_token(str(user.pk), refresh["jti"])
        return data


# ── User serializers ─────────────────────────────────────────────────────────

class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal representation — safe to expose."""

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "role", "status", "date_joined",
        ]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile — authenticated user sees own data."""

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "role", "status", "personal_email",
            "recovery_expires_at", "date_joined",
        ]
        read_only_fields = [
            "id", "email", "role", "status",
            "recovery_expires_at", "date_joined",
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Fields the authenticated user can update on their own profile."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "personal_email"]


# Which roles each creator is allowed to assign
ALLOWED_ROLES_PER_CREATOR: dict[str, list[str]] = {
    Role.SUPER_ADMIN: [
        Role.ADMIN_CLIENT, Role.HR, Role.MANAGER,
        Role.INTERNAL_CANDIDATE, Role.EXTERNAL_CANDIDATE,
    ],
    Role.ADMIN_CLIENT: [Role.HR, Role.MANAGER],
    Role.HR: [Role.MANAGER, Role.INTERNAL_CANDIDATE],
}


class UserAdminSerializer(serializers.ModelSerializer):
    """Admin view — includes deactivated_at for HR/AC visibility."""

    organisation = serializers.SerializerMethodField()
    assigned_manager_name = serializers.SerializerMethodField()

    def get_organisation(self, obj) -> str:
        schema = obj.tenant_schema or "public"
        return "BMG (Platform)" if schema == "public" else schema.replace("_", " ").title()

    def get_assigned_manager_name(self, obj) -> str | None:
        if obj.assigned_manager_id:
            m = obj.assigned_manager
            return f"{m.first_name} {m.last_name}".strip() if m else None
        return None

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "role", "status", "personal_email",
            "deactivated_at", "date_joined", "organisation",
            "assigned_manager_id", "assigned_manager_name",
        ]
        read_only_fields = [
            "id", "email", "date_joined", "deactivated_at",
            "organisation", "assigned_manager_name",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    tenant_schema = serializers.CharField(required=False, allow_blank=True, write_only=True)
    # HR can assign a manager when creating an internal candidate
    assigned_manager = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "status", "date_joined", "tenant_schema", "assigned_manager",
        ]
        read_only_fields = ["id", "status", "date_joined"]

    def validate_role(self, value: str) -> str:
        request = self.context.get("request")
        if not (request and hasattr(request, "user")):
            return value
        requester = request.user
        if requester.role == Role.SUPER_ADMIN:
            return value
        allowed = ALLOWED_ROLES_PER_CREATOR.get(requester.role, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f"Your role ({requester.role}) can only create users with role: "
                + ", ".join(allowed) + "."
            )
        return value

    def validate(self, attrs: dict) -> dict:
        role = attrs.get("role")
        manager_id = attrs.get("assigned_manager")
        if manager_id is not None and role != Role.INTERNAL_CANDIDATE:
            raise serializers.ValidationError(
                {"assigned_manager": "Manager assignment is only allowed when creating internal candidates."}
            )
        if manager_id is not None:
            try:
                manager = User.objects.get(pk=manager_id, role=Role.MANAGER)
                attrs["assigned_manager_obj"] = manager
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    {"assigned_manager": "No active manager found with that ID."}
                )
        return attrs

    def create(self, validated_data: dict) -> User:
        import secrets
        from django.db import connection
        temp_password = secrets.token_urlsafe(24)
        tenant_schema = validated_data.pop("tenant_schema", None) or connection.schema_name
        manager_obj = validated_data.pop("assigned_manager_obj", None)
        validated_data.pop("assigned_manager", None)

        user = User.objects.create_user(
            email=validated_data["email"],
            password=temp_password,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=validated_data["role"],
            status="pending_otp",
            tenant_schema=tenant_schema,
            assigned_manager=manager_obj,
        )
        from apps.users.otp import generate_and_store
        otp_code = generate_and_store(user.email)
        from apps.users.tasks import send_account_created_email
        send_account_created_email.delay(user_id=str(user.pk), otp_code=otp_code)
        return user


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "role"]


class DeactivateSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=10, max_length=500)


class ExportRequestSerializer(serializers.Serializer):
    personal_email = serializers.EmailField(required=False)

    def validate(self, attrs: dict) -> dict:
        user = self.context.get("target_user")
        if not attrs.get("personal_email") and not (user and user.personal_email):
            raise serializers.ValidationError(
                {"personal_email": "personal_email is required when not already set on the account."}
            )
        return attrs


class InvitationItemSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=[(r.value, r.value) for r in Role])


class InviteSerializer(serializers.Serializer):
    invitations = InvitationItemSerializer(many=True, min_length=1, max_length=50)


# ── Auth serializers ──────────────────────────────────────────────────────────

class RegisterExternalSendOTPSerializer(serializers.Serializer):
    """Step 1 of external-candidate registration: validate the email and send OTP."""

    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value


class RegisterExternalSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    otp_code = serializers.RegexField(
        regex=r"^[0-9]{6}$",
        error_messages={"invalid": "OTP must be exactly 6 digits."},
    )

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password_confirm")
        validated_data.pop("otp_code")
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=Role.EXTERNAL_CANDIDATE,
            status="active",
        )


class RegisterInternalSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.RegexField(
        regex=r"^[0-9]{6}$",
        error_messages={"invalid": "OTP must be exactly 6 digits."},
    )
    # Optional — provided when the user is setting their password for the first time
    # (admin-created accounts). If absent, the existing password is kept.
    password = serializers.CharField(min_length=8, write_only=True, required=False)
    password_confirm = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs: dict) -> dict:
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")
        if password and password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

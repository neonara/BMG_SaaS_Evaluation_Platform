"""apps/packs/views.py"""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.packs.models import Pack, PackTest, TenantPackAccess, Voucher
from apps.packs.serializers import (
    PackCreateSerializer,
    PackPublicSerializer,
    PackSerializer,
    PackTestSerializer,
    TenantPackAccessSerializer,
    VoucherGenerateSerializer,
    VoucherRedeemSerializer,
    VoucherSerializer,
)
from core.permissions.permissions import IsAdminClient, IsHR, IsSuperAdmin


@extend_schema(tags=["Packs"])
@extend_schema_view(
    list=extend_schema(summary="List packs"),
    create=extend_schema(summary="Create pack (Super Admin only)"),
    retrieve=extend_schema(summary="Get pack detail"),
    partial_update=extend_schema(summary="Update pack (Super Admin only)"),
)
class PackViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Pack.objects.prefetch_related("pack_tests__test")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return PackCreateSerializer
        if self.action in ("partial_update", "update"):
            return PackCreateSerializer
        return PackSerializer

    def get_permissions(self):
        if self.action in ("create", "partial_update", "update"):
            return [IsSuperAdmin()]
        if self.action in ("add_test", "generate_vouchers"):
            return [IsSuperAdmin()]
        if self.action == "vouchers":
            return [IsAdminClient()]
        if self.action in ("redeem", "my_access"):
            return [IsAuthenticated()]
        return [IsHR()]

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @extend_schema(summary="Add test to pack", responses={201: PackTestSerializer})
    @action(detail=True, methods=["post"], url_path="tests")
    def add_test(self, request, pk=None):
        pack = self.get_object()
        serializer = PackTestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(pack=pack)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="List vouchers for pack",
        responses={200: VoucherSerializer(many=True)},
    )
    @extend_schema(
        summary="Generate vouchers for pack",
        request=VoucherGenerateSerializer,
        responses={201: VoucherSerializer(many=True)},
    )
    @action(detail=True, methods=["get", "post"], url_path="vouchers")
    def vouchers(self, request, pk=None):
        pack = self.get_object()

        if request.method == "GET":
            qs = pack.vouchers.select_related("tenant")
            # admin_client sees only their tenant's vouchers
            if not IsSuperAdmin().has_permission(request, self):
                from django.db import connection
                qs = qs.filter(tenant__schema_name=connection.schema_name)
            serializer = VoucherSerializer(qs, many=True)
            return Response({"count": qs.count(), "results": serializer.data})

        # POST — generate new vouchers (super_admin only)
        if not IsSuperAdmin().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = VoucherGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tenant = serializer.validated_data["tenant_id"]
        quantity = serializer.validated_data["quantity"]
        validity = serializer.validated_data.get("validity_days", pack.validity_days)
        expires_at = timezone.now() + timedelta(days=validity)

        vouchers = [
            Voucher(pack=pack, tenant=tenant, expires_at=expires_at)
            for _ in range(quantity)
        ]
        Voucher.objects.bulk_create(vouchers)

        created = Voucher.objects.filter(
            pack=pack, tenant=tenant, expires_at=expires_at
        ).order_by("-created_at")[:quantity]
        return Response(VoucherSerializer(created, many=True).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Redeem a voucher",
        request=VoucherRedeemSerializer,
        responses={
            200: OpenApiResponse(description="Voucher redeemed — pack access granted."),
            400: OpenApiResponse(description="Invalid or already used voucher."),
        },
    )
    @action(detail=False, methods=["post"], url_path="redeem")
    def redeem(self, request):
        serializer = VoucherRedeemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]

        try:
            voucher = Voucher.objects.select_related("pack", "tenant").get(code=code)
        except Voucher.DoesNotExist:
            return Response({"detail": "Voucher not found."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access = voucher.redeem(user_email=request.user.email)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "status": "redeemed",
            "pack": PackSerializer(voucher.pack).data,
            "access_expires_at": access.access_expires_at,
        })

    @extend_schema(
        summary="My tenant's pack access",
        responses={200: TenantPackAccessSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="my-access")
    def my_access(self, request):
        from django.db import connection
        qs = TenantPackAccess.objects.filter(
            tenant__schema_name=connection.schema_name
        ).select_related("pack").prefetch_related("pack__pack_tests__test")
        return Response(TenantPackAccessSerializer(qs, many=True).data)


# ── Public catalogue (no auth) ────────────────────────────────────────────────

@extend_schema(tags=["Public"])
class PublicPackListView(APIView):
    """GET /api/v1/public/packs/ — vitrine catalogue, no authentication required."""
    permission_classes = [AllowAny]

    @extend_schema(summary="Public pack catalogue", responses={200: PackPublicSerializer(many=True)})
    def get(self, request):
        packs = Pack.objects.filter(status="active").prefetch_related("pack_tests")
        return Response(PackPublicSerializer(packs, many=True).data)

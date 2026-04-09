"""apps/packs/serializers.py"""
from __future__ import annotations

from rest_framework import serializers

from apps.packs.models import Pack, PackTest, TenantPackAccess, Voucher
from apps.tests_module.models import TestModel


class PackTestSerializer(serializers.ModelSerializer):
    test_id = serializers.UUIDField(write_only=True)
    test_title = serializers.CharField(source="test.title", read_only=True)
    test_category = serializers.CharField(source="test.category", read_only=True)
    test_status = serializers.CharField(source="test.status", read_only=True)

    class Meta:
        model = PackTest
        fields = ["id", "test_id", "test_title", "test_category", "test_status", "order", "added_at"]
        read_only_fields = ["id", "test_title", "test_category", "test_status", "added_at"]

    def validate_test_id(self, value):
        try:
            return TestModel.objects.get(pk=value)
        except TestModel.DoesNotExist:
            raise serializers.ValidationError("Test not found.")

    def create(self, validated_data: dict) -> PackTest:
        test = validated_data.pop("test_id")
        return PackTest.objects.create(test=test, **validated_data)


class PackSerializer(serializers.ModelSerializer):
    tests = PackTestSerializer(source="pack_tests", many=True, read_only=True)
    test_count = serializers.SerializerMethodField()

    def get_test_count(self, obj) -> int:
        return obj.pack_tests.count()

    class Meta:
        model = Pack
        fields = [
            "id", "name", "description", "price", "currency",
            "max_candidates", "validity_days", "status",
            "test_count", "tests", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "tests", "test_count"]


class PackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pack
        fields = [
            "id", "name", "description", "price", "currency",
            "max_candidates", "validity_days", "status",
        ]
        read_only_fields = ["id"]


class PackPublicSerializer(serializers.ModelSerializer):
    """Stripped-down — for vitrine / public catalogue."""
    test_count = serializers.SerializerMethodField()

    def get_test_count(self, obj) -> int:
        return obj.pack_tests.count()

    class Meta:
        model = Pack
        fields = [
            "id", "name", "description", "price", "currency",
            "max_candidates", "validity_days", "test_count",
        ]


class VoucherSerializer(serializers.ModelSerializer):
    pack_name = serializers.CharField(source="pack.name", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = Voucher
        fields = [
            "id", "code", "status", "expires_at",
            "redeemed_at", "redeemed_by_email",
            "pack_name", "tenant_name", "created_at",
        ]
        read_only_fields = fields


class VoucherGenerateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    tenant_id = serializers.UUIDField()
    validity_days = serializers.IntegerField(min_value=1, required=False)

    def validate_tenant_id(self, value):
        from apps.tenants.models import Tenant
        try:
            return Tenant.objects.get(pk=value)
        except Tenant.DoesNotExist:
            raise serializers.ValidationError("Tenant not found.")


class VoucherRedeemSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)


class TenantPackAccessSerializer(serializers.ModelSerializer):
    pack = PackSerializer(read_only=True)
    is_active = serializers.SerializerMethodField()

    def get_is_active(self, obj) -> bool:
        return obj.is_active()

    class Meta:
        model = TenantPackAccess
        fields = ["id", "pack", "access_expires_at", "granted_at", "is_active"]
        read_only_fields = fields

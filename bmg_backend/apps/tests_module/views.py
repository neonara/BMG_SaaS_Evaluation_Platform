"""apps/tests_module/views.py"""
from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tests_module.models import Question, TestModel
from apps.tests_module.serializers import (
    QuestionSerializer,
    TestCreateSerializer,
    TestSerializer,
    TestUpdateSerializer,
)
from core.permissions.permissions import IsManager, IsSuperAdmin


@extend_schema(tags=["Tests"])
@extend_schema_view(
    list=extend_schema(summary="List tests"),
    create=extend_schema(summary="Create test (Super Admin only)"),
    retrieve=extend_schema(summary="Get test detail"),
    partial_update=extend_schema(summary="Update test (creates new version if published)"),
)
class TestViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TestModel.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "sub_type", "visibility", "status"]
    search_fields = ["title"]
    ordering_fields = ["created_at", "title", "version"]

    def get_serializer_class(self):
        if self.action == "create":
            return TestCreateSerializer
        if self.action in ("partial_update", "update"):
            return TestUpdateSerializer
        return TestSerializer

    def get_permissions(self):
        if self.action in ("create", "partial_update", "update", "publish", "questions_create"):
            return [IsSuperAdmin()]
        if self.action == "questions":
            # GET questions: forbidden for candidates — IsManager covers super_admin..manager
            return [IsManager()]
        return [IsAuthenticated()]

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(TestSerializer(result).data)

    @extend_schema(
        summary="Publish test",
        responses={
            200: OpenApiResponse(description="Test published."),
            400: OpenApiResponse(description="Not a draft."),
        },
    )
    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        test = self.get_object()
        try:
            test.publish()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TestSerializer(test).data)

    @extend_schema(
        summary="List questions (staff only — never candidates)",
        responses={200: QuestionSerializer(many=True)},
    )
    @action(detail=True, methods=["get", "post"], url_path="questions")
    def questions(self, request, pk=None):
        test = self.get_object()

        if request.method == "GET":
            # Candidates are blocked by get_permissions → IsManager
            qs = test.questions.prefetch_related("answer_options").order_by("order")
            return Response(QuestionSerializer(qs, many=True).data)

        # POST — super_admin only (enforced by get_permissions via questions_create action)
        # Since action name for both GET+POST is "questions" we check role here for POST
        if not IsSuperAdmin().has_permission(request, self):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = QuestionSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(test=test)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

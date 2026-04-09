"""apps/tests_module/serializers.py"""
from __future__ import annotations

from rest_framework import serializers

from apps.tests_module.models import AnswerOption, Question, TestModel


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ["id", "text", "is_correct", "order"]
        read_only_fields = ["id"]


class QuestionSerializer(serializers.ModelSerializer):
    answer_options = AnswerOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "question_type", "text", "order", "points", "explanation", "answer_options"]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> Question:
        options_data = validated_data.pop("answer_options", [])
        question = Question.objects.create(**validated_data)
        for opt in options_data:
            AnswerOption.objects.create(question=question, **opt)
        return question

    def update(self, instance: Question, validated_data: dict) -> Question:
        options_data = validated_data.pop("answer_options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            instance.answer_options.all().delete()
            for opt in options_data:
                AnswerOption.objects.create(question=instance, **opt)
        return instance


class QuestionListSerializer(serializers.ModelSerializer):
    """Lightweight — no answer_options (used for list views)."""
    class Meta:
        model = Question
        fields = ["id", "question_type", "text", "order", "points"]
        read_only_fields = fields


class TestSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    parent_version_id = serializers.PrimaryKeyRelatedField(
        source="parent_version", read_only=True
    )

    def get_question_count(self, obj) -> int:
        return obj.questions.count()

    class Meta:
        model = TestModel
        fields = [
            "id", "title", "category", "sub_type", "visibility",
            "questions_per_session", "timer_seconds", "profile_count",
            "pass_threshold_pct", "status", "version", "parent_version_id",
            "question_count", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "version", "parent_version_id",
            "question_count", "created_at", "updated_at",
        ]


class TestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestModel
        fields = [
            "id", "title", "category", "sub_type", "visibility",
            "questions_per_session", "timer_seconds", "profile_count",
            "pass_threshold_pct", "status", "version", "created_at",
        ]
        read_only_fields = ["id", "status", "version", "created_at"]

    def create(self, validated_data: dict) -> TestModel:
        request = self.context.get("request")
        validated_data["created_by_email"] = request.user.email if request else ""
        return TestModel.objects.create(**validated_data)


class TestUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH on a draft: updates in place.
    PATCH on a published test: creates a new version (v+1, draft).
    """
    class Meta:
        model = TestModel
        fields = [
            "title", "category", "sub_type", "visibility",
            "questions_per_session", "timer_seconds", "profile_count",
            "pass_threshold_pct",
        ]

    def update(self, instance: TestModel, validated_data: dict) -> TestModel:
        if instance.status == "published":
            # Fork into new version
            new = instance.create_new_version()
            for attr, value in validated_data.items():
                setattr(new, attr, value)
            new.save()
            return new
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

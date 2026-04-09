"""
apps/tests_module/models.py
TestModel, Question, AnswerOption — Shared (public) schema.
Tests are created by BMG Super Admin and visible platform-wide.
Versioning: editing a published test creates a new draft row.
"""
from __future__ import annotations

import uuid

from django.db import models


class TestModel(models.Model):
    CATEGORY_CHOICES = [
        ("competence",  "Competence"),
        ("technical",   "Technical"),
    ]
    SUB_TYPE_CHOICES = [
        ("profiling",       "Profiling"),
        ("psychotechnique", "Psychotechnique"),
        ("technique",       "Technique"),
    ]
    VISIBILITY_CHOICES = [
        ("public",       "Public"),
        ("pack",         "Pack only"),
        ("personalized", "Personalized"),
    ]
    STATUS_CHOICES = [
        ("draft",     "Draft"),
        ("published", "Published"),
        ("archived",  "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    sub_type = models.CharField(max_length=20, choices=SUB_TYPE_CHOICES)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="public")
    questions_per_session = models.PositiveIntegerField(default=10)
    timer_seconds = models.PositiveIntegerField(null=True, blank=True)
    profile_count = models.PositiveIntegerField(null=True, blank=True)
    pass_threshold_pct = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    version = models.PositiveIntegerField(default=1)
    parent_version = models.ForeignKey(
        "self",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="child_versions",
    )
    created_by_email = models.EmailField(blank=True)  # audit — no FK (User is tenant-scoped)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tests_testmodel"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["visibility", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} (v{self.version}, {self.status})"

    def publish(self) -> None:
        if self.status != "draft":
            raise ValueError("Only draft tests can be published.")
        self.status = "published"
        self.save(update_fields=["status", "updated_at"])

    def create_new_version(self) -> "TestModel":
        """Fork this (published) test into a new draft. Called on PATCH of a published test."""
        new = TestModel.objects.create(
            title=self.title,
            category=self.category,
            sub_type=self.sub_type,
            visibility=self.visibility,
            questions_per_session=self.questions_per_session,
            timer_seconds=self.timer_seconds,
            profile_count=self.profile_count,
            pass_threshold_pct=self.pass_threshold_pct,
            status="draft",
            version=self.version + 1,
            parent_version=self,
            created_by_email=self.created_by_email,
        )
        # Clone all questions + their options
        for q in self.questions.all().prefetch_related("answer_options"):
            opts = list(q.answer_options.all())
            q.pk = None
            q.id = uuid.uuid4()
            q.test = new
            q.save()
            for opt in opts:
                opt.pk = None
                opt.id = uuid.uuid4()
                opt.question = q
                opt.save()
        return new


class Question(models.Model):
    TYPE_CHOICES = [
        ("mcq",        "Multiple Choice"),
        ("true_false", "True / False"),
        ("open",       "Open-ended"),
        ("ordering",   "Ordering"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(TestModel, on_delete=models.CASCADE, related_name="questions")
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=1)
    explanation = models.TextField(blank=True)  # shown after session ends

    class Meta:
        db_table = "tests_question"
        ordering = ["order"]

    def __str__(self) -> str:
        return f"Q{self.order}: {self.text[:60]}"


class AnswerOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answer_options")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "tests_answeroption"
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{'✓' if self.is_correct else '✗'} {self.text[:40]}"

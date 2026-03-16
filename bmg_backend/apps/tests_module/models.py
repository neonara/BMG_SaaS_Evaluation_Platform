"""
TEST_MODEL, QUESTION, ANSWER_OPTION, RESULT_BAND, PROFILE_DEFINITION. Tenant-scoped.
"""
from django.db import models

import uuid
# TEST_MODEL, QUESTION, ANSWER_OPTION, RESULT_BAND, PROFILE_DEFINITION
# Full implementation in Sprint 2.
# Models are versioned: editing creates a new row, old row → archived.
class TestModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=[("competence","Competence"),("technical","Technical")])
    sub_type = models.CharField(max_length=20, choices=[("profiling","Profiling"),("psychotechnique","Psychotechnique"),("technique","Technique")])
    visibility = models.CharField(max_length=20, choices=[("public","Public"),("pack","Pack"),("personalized","Personalized")])
    questions_per_session = models.PositiveIntegerField(default=10)
    timer_seconds = models.PositiveIntegerField(null=True, blank=True)
    profile_count = models.PositiveIntegerField(null=True, blank=True)
    pass_threshold_pct = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, default="draft")
    version = models.PositiveIntegerField(default=1)
    parent_version = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="versions")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "tests_testmodel"

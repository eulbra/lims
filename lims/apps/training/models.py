"""Training and competency models."""
import uuid
from django.db import models
from django.conf import settings


class TrainingRecord(models.Model):
    """Training completion record."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="training_records")
    topic = models.CharField(max_length=200)  # SOP title or topic name
    document = models.ForeignKey("documents.Document", on_delete=models.PROTECT, null=True, blank=True)
    training_type = models.CharField(max_length=20, choices=[
        ("SOP_REVIEW","SOP Review"),("EXTERNAL","External Course"),
        ("INTERNAL","Internal Training"),("ONBOARDING","Onboarding"),
    ])
    completed_at = models.DateTimeField(null=True, blank=True)
    trainer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    notes = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="training_records")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "training_records"


class CompetencyAssessment(models.Model):
    """CAP-required competency assessments."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="competency_assessments")
    assessment_type = models.CharField(max_length=50, choices=[
        ("DIRECT_OBSERVATION","Direct Observation of Routine Patient Test Performance"),
        ("MONITORING","Monitoring Recording and Reporting"),
        ("INTERMEDIATE_REVIEW","Review of Intermediate Test Results"),
        ("INSTRUMENT_MAINTENANCE","Direct Observation of Instrument Maintenance"),
        ("BLIND_SAMPLE","Blind Sample Testing"),
        ("PROBLEM_SOLVING","Problem Solving Skills"),
    ])
    panel = models.ForeignKey("samples.TestPanel", on_delete=models.PROTECT, null=True, blank=True)
    assessor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assessments_given")
    result = models.CharField(max_length=20, choices=[("PASS","Pass"),("FAIL","Fail"),("NEEDS_IMPROVEMENT","Needs Improvement")])
    assessment_date = models.DateField()
    notes = models.TextField(blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="competency_assessments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "competency_assessments"
        ordering = ["-assessment_date"]

"""Quality management — PT/EQA and audits."""
import uuid
from django.db import models
from django.conf import settings


class PTProgram(models.Model):
    """Proficiency Testing program enrollment."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)  # 'CAP CAP-PT', 'UK NEQAS'
    program_code = models.CharField(max_length=50, unique=True)
    panel = models.ForeignKey("samples.TestPanel", on_delete=models.PROTECT, related_name="pt_programs")
    frequency = models.CharField(max_length=20, choices=[("QUARTERLY","Quarterly"),("SEMI_ANNUALLY","Semi-Annually"),("ANNUALLY","Annually")])
    is_active = models.BooleanField(default=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="pt_programs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pt_programs"


class PTRound(models.Model):
    """Individual PT round/event."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(PTProgram, on_delete=models.CASCADE, related_name="rounds")
    round_number = models.CharField(max_length=20)
    sample_received_date = models.DateField()
    submission_deadline = models.DateField()
    submission_status = models.CharField(max_length=20, default="PENDING", choices=[
        ("PENDING","Pending"),("SUBMITTED","Submitted"),("SCORED","Scored"),("OVERDUE","Overdue"),
    ])
    result = models.CharField(max_length=20, null=True, blank=True, choices=[
        ("SATISFACTORY","Satisfactory"),("UNSATISFACTORY","Unsatisfactory"),
        ("MARGINAL","Marginal"),
    ])
    score = models.CharField(max_length=50, blank=True)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="pt_rounds")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pt_rounds"


class InternalAudit(models.Model):
    """Internal audit records."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit_title = models.CharField(max_length=200)
    audit_date = models.DateField()
    auditor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="audits_conducted")
    scope = models.TextField()
    status = models.CharField(max_length=20, default="PLANNED", choices=[
        ("PLANNED","Planned"),("IN_PROGRESS","In Progress"),("COMPLETED","Completed"),
    ])
    findings = models.JSONField(default=list, blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="internal_audits")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "internal_audits"

"""Quality Control models."""
import uuid
from django.db import models
from django.conf import settings

class QCControlMaterial(models.Model):
    """QC control material definition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    material_type = models.CharField(max_length=50, choices=[
        ("POSITIVE","Positive"),("NEGATIVE","Negative"),("NTC","No Template Control"),("REFERENCE","Reference"),
    ])
    manufacturer = models.CharField(max_length=200, blank=True)
    catalog_number = models.CharField(max_length=100, blank=True)
    lot_number = models.CharField(max_length=100)
    expiry_date = models.DateField(null=True, blank=True)
    target_values = models.JSONField(default=dict, blank=True)  # {"metric": {"mean": x, "sd": y}}
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="qc_materials")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "qc_control_materials"

    def __str__(self):
        return f"{self.name} (Lot {self.lot_number})"


class QCRun(models.Model):
    """Single QC run result."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey("workflows.SampleRun", on_delete=models.CASCADE, related_name="qc_runs")
    control_material = models.ForeignKey(QCControlMaterial, on_delete=models.PROTECT)
    measured_values = models.JSONField(default=dict)  # {"fetal_fraction": 9.5, "q30": 89.2}
    pass_fail = models.CharField(max_length=10, choices=[("PASS","Pass"),("FAIL","Fail"),("REVIEW","Review")])
    westgard_violations = models.JSONField(default=list, blank=True)  # ["1-2s", "1-3s"]
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "qc_runs"

    def __str__(self):
        return f"QC {self.control_material.name} - {self.run.run_number}"


class QCChart(models.Model):
    """Levey-Jennings chart definition for a metric."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_name = models.CharField(max_length=100)
    panel = models.ForeignKey("samples.TestPanel", on_delete=models.CASCADE, related_name="qc_charts")
    control_material = models.ForeignKey(QCControlMaterial, on_delete=models.PROTECT)
    target_mean = models.DecimalField(max_digits=10, decimal_places=4)
    target_sd = models.DecimalField(max_digits=10, decimal_places=4)
    warning_sd = models.DecimalField(max_digits=10, decimal_places=4, default=2)
    action_sd = models.DecimalField(max_digits=10, decimal_places=4, default=3)
    westgard_rules = models.JSONField(default=list)  # ["1-2s", "1-3s", "2-2s", "R-4s"]
    is_active = models.BooleanField(default=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="qc_charts")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "qc_charts"


class QCEvent(models.Model):
    """CAPA, deviations, and QC events."""
    SEVERITY_CHOICES = [("LOW","Low"),("MEDIUM","Medium"),("HIGH","High"),("CRITICAL","Critical")]
    STATUS_CHOICES = [("OPEN","Open"),("INVESTIGATING","Investigating"),("RESOLVED","Resolved"),("CLOSED","Closed")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=50, choices=[
        ("QC_FAILURE","QC Failure"),("PT_UNSATISFACTORY","PT Unsatisfactory"),
        ("DEVIATION","Deviation"),("INSTRUMENT_FAILURE","Instrument Failure"),
        ("CUSTOMER_COMPLAINT","Customer Complaint"),
    ])
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="MEDIUM")
    summary = models.TextField()
    description = models.TextField(blank=True)
    affected_samples = models.JSONField(default=list, blank=True)
    affected_reports = models.JSONField(default=list, blank=True)
    root_cause = models.TextField(blank=True)
    corrective_action = models.TextField(blank=True)
    preventive_action = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN", db_index=True)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    target_date = models.DateField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="qc_events")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "qc_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity}] {self.event_type}: {self.summary[:80]}"

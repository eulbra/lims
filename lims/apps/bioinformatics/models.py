"""Bioinformatics pipeline models."""
import uuid
from django.db import models
from django.conf import settings


class Pipeline(models.Model):
    """Registered bioinformatics pipeline."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)  # 'NIPT_v2', 'HPV_v1'
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=20)
    engine = models.CharField(max_length=20, choices=[
        ("NEXTFLOW","Nextflow"),("SNAKEMAKE","Snakemake"),("CWL","CWL"),
    ])
    reference_genome = models.CharField(max_length=20, default="GRCh38")
    is_active = models.BooleanField(default=True)
    validation_status = models.CharField(max_length=20, default="IN_PROGRESS", choices=[
        ("IN_PROGRESS","In Progress"),("PASSED","Passed"),("FAILED","Failed"),("RETIRED","Retired"),
    ])
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="pipelines")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pipelines"
        unique_together = [["code", "version"]]

    def __str__(self):
        return f"{self.code} v{self.version}"


class PipelineValidation(models.Model):
    """Pipeline validation records."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="validations")
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    precision = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sensitivity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    specificity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    reproducibility = models.TextField(blank=True)
    samples_tested = models.PositiveIntegerField(default=0)
    reference_method = models.CharField(max_length=200, blank=True)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    validated_at = models.DateTimeField()
    validation_report = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pipeline_validations"


class AnalysisJob(models.Model):
    """Pipeline analysis job."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey("workflows.SampleRun", on_delete=models.CASCADE, related_name="analysis_jobs")
    pipeline = models.ForeignKey(Pipeline, on_delete=models.PROTECT)
    parameters = models.JSONField(default=dict, blank=True)
    input_files = models.JSONField(default=dict, blank=True)  # {"fastq_r1": "s3://...", "fastq_r2": "..."}
    status = models.CharField(max_length=20, default="QUEUED", choices=[
        ("QUEUED","Queued"),("RUNNING","Running"),("COMPLETED","Completed"),
        ("FAILED","Failed"),("TIMEOUT","Timeout"),("CANCELLED","Cancelled"),
    ], db_index=True)
    output_files = models.JSONField(default=dict, blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    callback_url = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "analysis_jobs"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Job {self.id} - {self.status}"

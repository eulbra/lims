"""Document management models."""
import uuid
from django.db import models
from django.conf import settings


class Document(models.Model):
    """SOP, form template, or training material."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc_type = models.CharField(max_length=20, choices=[
        ("SOP","SOP"),("FORM","Form"),("POLICY","Policy"),("TEMPLATE","Template"),("TRAINING","Training Material"),
    ])
    title = models.CharField(max_length=200)
    document_number = models.CharField(max_length=30, unique=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, default="DRAFT", choices=[
        ("DRAFT","Draft"),("IN_REVIEW","In Review"),("APPROVED","Approved"),
        ("PUBLISHED","Published"),("SUPERSEDED","Superseded"),
    ])
    file_path = models.CharField(max_length=500, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="approved_documents")
    approved_at = models.DateTimeField(null=True, blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="documents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "documents"

    def __str__(self):
        return f"{self.document_number} v{self.version} - {self.title}"


class DocumentAcknowledgment(models.Model):
    """Track who has read and understood each document."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="acknowledgments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    acknowledged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_acknowledgments"
        unique_together = [["document", "user"]]

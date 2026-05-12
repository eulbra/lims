"""Shared Attachment and Note models — attach files and notes to any entity."""
import uuid
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Attachment(models.Model):
    """A file attached to any model via GenericForeignKey."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to="attachments/%Y/%m/%d/")
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)  # bytes
    content_type_str = models.CharField(max_length=100)  # e.g., "samples.Sample"
    # Generic FK
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")
    category = models.CharField(max_length=30, choices=[
        ("SOP", "SOP"),
        ("CERTIFICATE", "Certificate"),
        ("QC_REPORT", "QC Report"),
        ("IMAGE", "Image"),
        ("OTHER", "Other"),
    ], default="OTHER")
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="attachments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attachments"

    def __str__(self):
        return f"{self.filename} → {self.content_type_str}:{self.object_id}"


class Note(models.Model):
    """A text note attached to any model via GenericForeignKey."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")
    text = models.TextField()
    author = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="notes")
    is_internal = models.BooleanField(default=False, help_text="Internal note (not visible on reports)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notes"
        ordering = ["-created_at"]

    def __str__(self):
        preview = self.text[:60]
        return f"Note by {self.author}: {preview}..."

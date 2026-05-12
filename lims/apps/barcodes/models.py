"""Barcode printer and template management."""
import uuid
from django.db import models


class BarcodePrinter(models.Model):
    """A configured barcode printer (Zebra, etc.)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    printer_type = models.CharField(max_length=30, choices=[
        ("ZEBRA", "Zebra"),
        ("BROTHER", "Brother"),
        ("DYMO", "Dymo"),
        ("GENERIC", "Generic"),
    ])
    ip_address = models.CharField(max_length=100, blank=True)
    port = models.IntegerField(default=9100)
    label_width_mm = models.IntegerField(default=50)
    label_height_mm = models.IntegerField(default=25)
    dpi = models.IntegerField(default=203)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="barcode_printers")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "barcode_printers"

    def __str__(self):
        return f"{self.name} ({self.get_printer_type_display()})"


class BarcodeLabel(models.Model):
    """A printed/assigned barcode label."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barcode = models.CharField(max_length=100, unique=True)
    label_type = models.CharField(max_length=20, choices=[
        ("SAMPLE", "Sample Tube"),
        ("BOX", "Storage Box"),
        ("REAGENT", "Reagent"),
        ("GENERIC", "Generic"),
    ])
    content_type = models.CharField(max_length=50, blank=True)  # Model name (Sample, Box, etc.)
    object_id = models.CharField(max_length=50, blank=True)     # PK of the linked object
    printer = models.ForeignKey(BarcodePrinter, on_delete=models.SET_NULL, null=True, blank=True)
    printed_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    copies = models.IntegerField(default=1)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="barcode_labels")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "barcode_labels"

    def __str__(self):
        return f"{self.barcode} ({self.get_label_type_display()})"

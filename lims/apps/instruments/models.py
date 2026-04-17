"""Instrument management models."""
import uuid
from django.db import models
from django.conf import settings

class Instrument(models.Model):
    """Lab instrument (sequencer, centrifuge, etc.)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    instrument_type = models.CharField(max_length=50)  # 'SEQUENCER', 'CENTRIFUGE', 'QUBIT', etc.
    manufacturer = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100)
    asset_tag = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE", choices=[
        ("ACTIVE","Active"),("MAINTENANCE","Maintenance"),
        ("OUT_OF_SERVICE","Out of Service"),("RETIRED","Retired"),
    ])
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="instruments")
    iq_date = models.DateField(null=True, blank=True)  # Installation Qualification
    oq_date = models.DateField(null=True, blank=True)  # Operational Qualification
    pq_date = models.DateField(null=True, blank=True)  # Performance Qualification
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "instruments"

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class InstrumentMaintenance(models.Model):
    """Maintenance log for instruments."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE, related_name="maintenance_logs")
    maintenance_type = models.CharField(max_length=20, choices=[
        ("PREVENTIVE","Preventive"),("CORRECTIVE","Corrective"),("CALIBRATION","Calibration"),
    ])
    description = models.TextField()
    performed_by = models.CharField(max_length=200)
    performed_at = models.DateTimeField()
    next_due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "instrument_maintenance"

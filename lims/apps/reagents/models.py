"""Reagent and inventory models."""
import uuid
from django.db import models
from django.conf import settings

class Reagent(models.Model):
    """Reagent/consumable definition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    catalog_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    reagent_type = models.CharField(max_length=50, default="KIT", choices=[
        ("KIT","Kit"),("ENZYME","Enzyme"),("PRIMER","Primer"),
        ("CONTROL","Control"),("CONSUMABLE","Consumable"),
    ])
    storage_temp = models.CharField(max_length=20, blank=True)
    hazardous = models.BooleanField(default=False)
    cas_number = models.CharField(max_length=20, blank=True)
    sds_file_path = models.CharField(max_length=500, blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="reagents")

    class Meta:
        db_table = "reagents"

    def __str__(self):
        return f"{self.name} ({self.catalog_number})"


class ReagentLot(models.Model):
    """Specific lot of a reagent with lot-level tracking."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reagent = models.ForeignKey(Reagent, on_delete=models.PROTECT, related_name="lots")
    lot_number = models.CharField(max_length=100)
    coa_file_path = models.CharField(max_length=500, blank=True)
    received_date = models.DateField()
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    expiry_date = models.DateField(null=True, blank=True)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, blank=True)
    storage_location = models.CharField(max_length=200, blank=True)
    quality_status = models.CharField(max_length=20, default="PENDING_QC", choices=[
        ("PENDING_QC","Pending QC"),("QC_PASSED","QC Passed"),("QC_FAILED","QC Failed"),
        ("IN_USE","In Use"),("EXPIRED","Expired"),("DEPLETED","Depleted"),
    ])
    qc_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reagent_lots"
        unique_together = [["reagent", "lot_number"]]

    def __str__(self):
        return f"{self.reagent.name} - Lot {self.lot_number}"


class InventoryTransaction(models.Model):
    """Track every inventory movement (receive, use, adjust, discard)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey(ReagentLot, on_delete=models.PROTECT, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=[
        ("RECEIVED","Received"),("USED","Used"),("RETURNED","Returned"),
        ("ADJUSTED","Adjusted"),("EXPIRED","Expired"),("DISCARDED","Discarded"),
    ])
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, blank=True)
    reference_type = models.CharField(max_length=50, blank=True)  # 'run', 'step', 'qc'
    reference_id = models.UUIDField(null=True, blank=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_transactions"
        ordering = ["-created_at"]

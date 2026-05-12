"""Storage management models — Box, Freezer, and physical sample location tracking."""
import uuid
from django.db import models


class StorageLocation(models.Model):
    """A physical storage location: Freezer, Refrigerator, Room, Shelf, Rack, etc."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    location_type = models.CharField(max_length=30, choices=[
        ("FREEZER", "Freezer (-80°C/-20°C)"),
        ("REFRIGERATOR", "Refrigerator (4°C)"),
        ("ROOM_TEMP", "Room Temperature"),
        ("LN2", "Liquid Nitrogen"),
    ])
    barcode = models.CharField(max_length=100, blank=True, unique=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="children",
        help_text="Parent location (e.g., Freezer contains Shelves)"
    )
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="storage_locations")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "storage_locations"

    def __str__(self):
        return f"{self.name} ({self.get_location_type_display()})"


class Box(models.Model):
    """A box/tray containing samples placed at a storage location."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    barcode = models.CharField(max_length=100, blank=True, unique=True)
    box_size = models.CharField(max_length=20, choices=[
        ("9x9", "9×9 (81)"),
        ("10x10", "10×10 (100)"),
    ])
    storage_location = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="boxes"
    )
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="boxes")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "storage_boxes"
        verbose_name_plural = "boxes"

    def __str__(self):
        return f"{self.name} ({self.box_size})"


class BoxPosition(models.Model):
    """A position within a box, optionally occupied by a sample."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    box = models.ForeignKey(Box, on_delete=models.CASCADE, related_name="positions")
    row = models.CharField(max_length=3)   # A, B, C, ...
    col = models.PositiveSmallIntegerField()  # 1, 2, 3, ...
    sample = models.ForeignKey(
        "samples.Sample", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="box_positions",
        help_text="Sample occupying this position (null = empty)"
    )
    occupied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "storage_box_positions"
        unique_together = [("box", "row", "col")]
        ordering = ["box", "row", "col"]

    def position_label(self):
        return f"{self.row}{self.col}"

    def __str__(self):
        sample = self.sample.sample_id if self.sample else "empty"
        return f"Box {self.box.name} [{self.row}{self.col}] → {sample}"

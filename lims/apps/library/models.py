"""Library Index management — Index families, individual index sequences, and library design definitions."""
import uuid
from django.db import models


class IndexFamily(models.Model):
    """A set of related indices (e.g., Illumina TruSeq, Nextera, custom)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    platform = models.CharField(max_length=30, choices=[
        ("ILLUMINA", "Illumina"),
        ("ION_TORRENT", "Ion Torrent"),
        ("PACBIO", "PacBio"),
        ("ONT", "Oxford Nanopore"),
        ("CUSTOM", "Custom"),
    ])
    index_type = models.CharField(max_length=20, choices=[
        ("SINGLE", "Single Index (i7)"),
        ("DUAL", "Dual Index (i7 + i5)"),
    ])
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="index_families")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_index_families"
        verbose_name_plural = "index families"

    def __str__(self):
        return f"{self.name} ({self.platform})"


class Index(models.Model):
    """A single index/barcode sequence within a family."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(IndexFamily, on_delete=models.CASCADE, related_name="indices")
    name = models.CharField(max_length=50)  # e.g., "D701", "N501"
    sequence = models.CharField(max_length=20)  # e.g., "ATTACTCG"
    index_position = models.CharField(max_length=3, choices=[
        ("i7", "i7 (P7 side)"),
        ("i5", "i5 (P5 side)"),
    ])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_indices"
        verbose_name_plural = "indices"
        unique_together = [("family", "name"), ("family", "sequence")]

    def __str__(self):
        return f"{self.name}: {self.sequence} ({self.index_position})"


class LibraryDesign(models.Model):
    """A library preparation design/kit definition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    design_code = models.CharField(max_length=20, unique=True)
    index_family = models.ForeignKey(IndexFamily, on_delete=models.PROTECT, null=True, blank=True)
    selection_type = models.CharField(max_length=30, choices=[
        ("PCR", "PCR"),
        ("HYBRID_CAPTURE", "Hybridization Capture"),
        ("RANDOM", "Random"),
        ("RT", "Reverse Transcription"),
        ("SIZE_SELECTION", "Size Selection"),
    ])
    strategy_type = models.CharField(max_length=30, choices=[
        ("WGS", "Whole Genome Sequencing"),
        ("WES", "Whole Exome Sequencing"),
        ("AMPLICON", "Amplicon"),
        ("RNA_SEQ", "RNA-Seq"),
        ("TARGETED", "Targeted Sequencing"),
    ])
    description = models.TextField(blank=True)
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="library_designs")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_designs"

    def __str__(self):
        return f"{self.design_code} — {self.name}"

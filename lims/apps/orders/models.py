"""Order models."""
import uuid
from django.db import models
from django.conf import settings

class Order(models.Model):
    """Test order from a client/physician."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=30, unique=True, db_index=True)
    panel = models.ForeignKey("samples.TestPanel", on_delete=models.PROTECT)
    ordering_physician = models.CharField(max_length=200)
    ordering_facility = models.CharField(max_length=200)
    patient_id = models.CharField(max_length=50, blank=True, db_index=True)
    patient_name = models.CharField(max_length=200, blank=True)
    patient_dob = models.DateField(null=True, blank=True)
    patient_sex = models.CharField(max_length=1, choices=[("M","M"),("F","F"),("O","O")], blank=True)
    urgency = models.CharField(max_length=10, default="ROUTINE", choices=[("ROUTINE","Routine"),("STAT","STAT"),("RESEARCH","Research")])
    clinical_notes = models.TextField(blank=True)
    sample = models.ForeignKey(
        "samples.Sample",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders",
    )
    status = models.CharField(max_length=20, default="CREATED", choices=[
        ("CREATED","Created"),("SAMPLED","Sampled"),("IN_PROGRESS","In Progress"),
        ("COMPLETED","Completed"),("REPORTED","Reported"),("CANCELLED","Cancelled"),
    ])
    site = models.ForeignKey("organizations.Site", on_delete=models.PROTECT, related_name="orders")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

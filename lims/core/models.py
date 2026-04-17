"""Base models for LIMS."""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class SiteModel(models.Model):
    """Abstract base model that associates records with a site."""
    site = models.ForeignKey(
        "organizations.Site",
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True


class BaseModel(models.Model):
    """Abstract base model with UUID pk and audit fields."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_created",
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_updated",
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SiteBaseModel(SiteModel, BaseModel):
    """Combined site-scoped base model."""
    class Meta:
        abstract = True
        ordering = ["-created_at"]


class VersionedModel(models.Model):
    """Abstract model that supports versioning."""
    version = models.PositiveIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    superceded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """Abstract model with soft delete support."""
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=["is_deleted", "deleted_at", "deleted_by", "updated_at"])

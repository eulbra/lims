"""Quality Management app configuration."""
from django.apps import AppConfig


class QualityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.quality"
    verbose_name = "Quality Management"

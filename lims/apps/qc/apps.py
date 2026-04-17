"""Quality Control app configuration."""
from django.apps import AppConfig


class QcConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.qc"
    verbose_name = "Quality Control"

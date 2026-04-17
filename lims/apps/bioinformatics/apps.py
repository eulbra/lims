"""Bioinformatics app configuration."""
from django.apps import AppConfig


class BioinformaticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.bioinformatics"
    verbose_name = "Bioinformatics"

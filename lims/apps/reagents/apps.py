"""Reagents app configuration."""
from django.apps import AppConfig


class ReagentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.reagents"
    verbose_name = "Reagents"

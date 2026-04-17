"""Notifications app configuration."""
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.notifications"
    verbose_name = "Notifications"

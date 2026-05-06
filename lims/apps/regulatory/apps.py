from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class RegulatoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lims.apps.regulatory"
    verbose_name = _("巴西法规管理")

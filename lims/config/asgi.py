"""ASGI config for LIMS."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lims.config.settings.base")
application = get_asgi_application()

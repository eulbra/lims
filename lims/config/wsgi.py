"""WSGI config for LIMS."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lims.config.settings.base")
application = get_wsgi_application()

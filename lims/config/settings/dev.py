"""Development settings."""
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Email to console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# CORS for frontend dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Disable CORS origin checking for dev
CORS_ALLOW_ALL_ORIGINS = True

# Disable SSL redirect for dev
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Simpler password validators for dev
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 6}},
]

# Debug toolbar (only if installed)
try:
    import debug_toolbar  # noqa
    INSTALLED_APPS += ["debug_toolbar"]
    MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass


# Use SQLite for development (no external DB needed)
import pathlib
_DB_PATH = pathlib.Path("/home/hankchen/lims") / "db.sqlite3"
_DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(_DB_PATH),
    }
}
DATABASES = _DATABASES

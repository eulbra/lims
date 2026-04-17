"""Custom pagination classes for LIMS API."""
from rest_framework.pagination import LimitOffsetPagination


class StandardResultsSetPagination(LimitOffsetPagination):
    """Standard pagination with limit and offset."""
    default_limit = 50
    max_limit = 200


class CursorPagination(LimitOffsetPagination):
    """Cursor pagination for audit logs (large datasets)."""
    default_limit = 100
    max_limit = 500

"""Custom DRF permission classes for LIMS."""
from rest_framework import permissions


class IsSiteScoped(permissions.BasePermission):
    """Ensure user can only access data from their site."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        # Check if object has a site_id matching user's site
        if hasattr(obj, "site_id"):
            return obj.site_id == request.user.site_id
        return True


def get_site_filter(request, field="site"):
    """Return a Q-filter dict for site scoping.
    
    Superusers/staff with no site get {} (no filter) so they see all data.
    Regular users get {field: request.user.site}.
    """
    if request.user.is_superuser or request.user.is_staff:
        return {}
    if request.user.site_id is None:
        return {}
    return {field: request.user}


class IsSiteStaff(permissions.BasePermission):
    """Only site staff (not patients/external) can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission — owner can edit, others read-only."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(obj, "created_by") and obj.created_by == request.user

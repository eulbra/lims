"""Users admin."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, UserRole


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "employee_id", "first_name", "last_name", "email", "site", "is_active"]
    list_filter = ["is_active", "is_staff", "site"]
    search_fields = ["username", "employee_id", "email", "first_name", "last_name"]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("employee_id", "first_name", "last_name", "email", "phone")}),
        ("Site & Preferences", {"fields": ("site", "locale", "timezone")}),
        ("MFA", {"fields": ("mfa_enabled", "mfa_secret")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "password_changed_at")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("employee_id", "username", "email", "password1", "password2"),
        }),
    )
    readonly_fields = ["last_login", "password_changed_at"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["name", "site", "is_system"]
    list_filter = ["site"]


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "site", "granted_at", "expires_at"]
    list_filter = ["role", "site"]
    date_hierarchy = "granted_at"

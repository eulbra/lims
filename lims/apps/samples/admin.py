"""Samples admin."""
from django.contrib import admin
from .models import Sample, SampleType, TestPanel, SampleMovement


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ["barcode", "patient_id", "sample_type", "status", "receipt_date", "site"]
    list_filter = ["status", "sample_type", "site", "receipt_date"]
    search_fields = ["barcode", "patient_id", "patient_name"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "receipt_date"


@admin.register(SampleType)
class SampleTypeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_active"]


@admin.register(TestPanel)
class TestPanelAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_active", "site"]
    list_filter = ["code", "site"]

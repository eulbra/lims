"""Barcode serializers."""
from rest_framework import serializers
from .models import BarcodePrinter, BarcodeLabel


class BarcodePrinterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarcodePrinter
        fields = "__all__"
        read_only_fields = ["created_at", "site"]


class BarcodeLabelSerializer(serializers.ModelSerializer):
    printed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BarcodeLabel
        fields = "__all__"
        read_only_fields = ["created_at", "site"]

    def get_printed_by_name(self, obj):
        if obj.printed_by:
            return f"{obj.printed_by.first_name} {obj.printed_by.last_name}".strip()
        return None

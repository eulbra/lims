"""Report serializers."""
from rest_framework import serializers
from .models import ReportTemplate, Report, ElectronicSignature


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = "__all__"
        read_only_fields = ["created_by"]


class ReportListSerializer(serializers.ModelSerializer):
    sample_barcode = serializers.CharField(source="sample.barcode", read_only=True)
    patient_name = serializers.CharField(source="sample.patient_name", read_only=True, default="")
    panel_code = serializers.CharField(source="sample.testpanel", read_only=True, default="")

    class Meta:
        model = Report
        fields = [
            "id", "report_number", "sample", "sample_barcode", "patient_name", "panel_code",
            "status", "version_number", "released_at", "created_at",
        ]


class ReportSerializer(serializers.ModelSerializer):
    """Full report detail."""

    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = [
            "report_number", "reviewed_by", "reviewed_at",
            "verified_by", "verified_at", "signed_by", "signed_at", "released_at",
        ]


class ReportReviewSerializer(serializers.Serializer):
    """Action serializers for review workflow."""
    pass  # No body needed, just status change


class ElectronicSignatureSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ElectronicSignature
        fields = [
            "id", "entity_type", "entity_id", "user", "user_name",
            "action", "meaning", "signed_at", "ip_address",
        ]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}" if obj.user else None

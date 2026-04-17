"""Quality serializers — PT/EQA and Internal Audit."""
from rest_framework import serializers
from .models import PTProgram, PTRound, InternalAudit


class PTProgramSerializer(serializers.ModelSerializer):
    round_count = serializers.SerializerMethodField()

    class Meta:
        model = PTProgram
        fields = ["id", "name", "program_code", "panel", "panel_name",
                  "frequency", "is_active", "site", "round_count", "created_at"]
        read_only_fields = ["created_at"]

    def get_round_count(self, obj):
        return obj.rounds.count()


class PTRoundSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = PTRound
        fields = "__all__"
        read_only_fields = ["submitted_by", "submitted_at", "site", "created_at"]


class InternalAuditSerializer(serializers.ModelSerializer):
    auditor_name = serializers.SerializerMethodField()

    class Meta:
        model = InternalAudit
        fields = "__all__"
        read_only_fields = ["site", "created_at"]

    def get_auditor_name(self, obj):
        return f"{obj.auditor}" if obj.auditor else None

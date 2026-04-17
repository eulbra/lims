"""Training serializers."""
from rest_framework import serializers
from .models import TrainingRecord, CompetencyAssessment


class TrainingRecordSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()

    class Meta:
        model = TrainingRecord
        fields = "__all__"
        read_only_fields = ["created_at"]

    def get_trainer_name(self, obj):
        return f"{obj.trainer}" if obj.trainer else None

    def get_document_title(self, obj):
        return obj.document.title if obj.document else None


class TrainingRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingRecord
        fields = ["user", "topic", "document", "training_type", "trainer", "notes", "due_date"]


class CompetencyAssessmentSerializer(serializers.ModelSerializer):
    assessor_name = serializers.SerializerMethodField()
    panel_name = serializers.SerializerMethodField()

    class Meta:
        model = CompetencyAssessment
        fields = "__all__"
        read_only_fields = ["created_at"]

    def get_assessor_name(self, obj):
        return f"{obj.assessor}" if obj.assessor else None

    def get_panel_name(self, obj):
        return obj.panel.name if obj.panel else None


class CompetencyAssessmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencyAssessment
        fields = ["user", "assessment_type", "panel", "result", "assessment_date", "notes"]

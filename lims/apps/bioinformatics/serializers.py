"""Bioinformatics serializers."""
from rest_framework import serializers
from .models import Pipeline, PipelineValidation, AnalysisJob


class PipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = "__all__"
        read_only_fields = ["validated_at", "validated_by"]


class PipelineValidationSerializer(serializers.ModelSerializer):
    pipeline_name = serializers.CharField(source="pipeline.code", read_only=True)

    class Meta:
        model = PipelineValidation
        fields = "__all__"
        read_only_fields = ["validated_by", "validated_at"]


class AnalysisJobSerializer(serializers.ModelSerializer):
    run_number = serializers.CharField(source="run.run_number", read_only=True)
    pipeline_name = serializers.CharField(source="pipeline.code", read_only=True)

    class Meta:
        model = AnalysisJob
        fields = [
            "id", "run", "run_number", "pipeline", "pipeline_name",
            "parameters", "status", "metrics", "error_message",
            "submitted_at", "started_at", "completed_at",
        ]
        read_only_fields = ["submitted_at"]


class AnalysisJobCreateSerializer(serializers.Serializer):
    run = serializers.UUIDField()
    pipeline = serializers.UUIDField()
    parameters = serializers.DictField(required=False, default=dict)
    input_files = serializers.DictField()


class PipelineWebhookSerializer(serializers.Serializer):
    """Webhook callback from pipeline execution."""
    job_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=["completed", "failed", "timeout"])
    completed_at = serializers.DateTimeField(required=False)
    metrics = serializers.DictField(required=False, default=dict)
    output_files = serializers.DictField(required=False, default=dict)
    error_message = serializers.CharField(required=False, allow_blank=True)
    pipeline_version = serializers.CharField(required=False)

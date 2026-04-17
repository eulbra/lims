"""Workflow serializers."""
from rest_framework import serializers
from .models import WorkflowProtocol, SampleRun, RunSample, WorkflowStep


class WorkflowProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowProtocol
        fields = "__all__"
        read_only_fields = ["validated_at", "validated_by", "created_by"]


class WorkflowProtocolDetailSerializer(WorkflowProtocolSerializer):
    """Add parsed steps for detailed view."""
    run_count = serializers.SerializerMethodField()

    def get_run_count(self, obj):
        return obj.runs.count()


class RunSampleSerializer(serializers.ModelSerializer):
    sample_barcode = serializers.CharField(source="sample.barcode", read_only=True)
    sample_patient_id = serializers.CharField(source="sample.patient_id", read_only=True, default="")

    class Meta:
        model = RunSample
        fields = [
            "id", "run", "sample", "sample_barcode", "sample_patient_id",
            "well_position", "plate_number", "index_sequence", "index_combo_id",
            "pool_group", "status", "result_summary", "created_at",
        ]
        read_only_fields = ["created_at"]


class SampleRunSerializer(serializers.ModelSerializer):
    panel_code = serializers.CharField(source="panel.code", read_only=True)
    panel_name = serializers.CharField(source="panel.name", read_only=True)
    sequencer_name = serializers.CharField(source="sequencer.name", read_only=True)
    sample_count = serializers.SerializerMethodField()
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = SampleRun
        fields = [
            "id", "run_number", "panel", "panel_code", "panel_name",
            "protocol", "sequencer", "sequencer_name", "status",
            "planned_date", "start_date", "end_date",
            "operator", "operator_name", "notes",
            "sample_count", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_sample_count(self, obj):
        return obj.run_samples.count()

    def get_operator_name(self, obj):
        if obj.operator:
            return f"{obj.operator.first_name} {obj.operator.last_name}"
        return None


class SampleRunCreateSerializer(serializers.Serializer):
    """Create a new run and assign samples."""
    panel = serializers.UUIDField()
    protocol = serializers.UUIDField(required=False)
    sequencer = serializers.UUIDField(required=False)
    samples = serializers.ListField(child=serializers.UUIDField())
    planned_date = serializers.DateField(required=False)
    index_assignments = serializers.DictField(required=False)
    # e.g. {"uuid-1": {"well": "A01", "index": "N701+S501"}}
    notes = serializers.CharField(required=False)


class SampleRunDetailSerializer(SampleRunSerializer):
    """Nested data for detailed view."""
    run_samples = RunSampleSerializer(many=True, read_only=True)
    steps = serializers.SerializerMethodField()

    def get_steps(self, obj):
        return WorkflowStepSerializer(obj.steps.all(), many=True).data


class WorkflowStepSerializer(serializers.ModelSerializer):
    sample_barcode = serializers.CharField(source="sample.barcode", read_only=True, default=None)

    class Meta:
        model = WorkflowStep
        fields = [
            "id", "run", "sample", "sample_barcode",
            "step_id", "step_name", "step_order", "status",
            "started_at", "completed_at", "observations",
            "deviation_flag", "deviation_note", "created_at",
        ]
        read_only_fields = ["created_at"]


class WorkflowStepUpdateSerializer(serializers.Serializer):
    """Update a step's status and results."""
    status = serializers.ChoiceField(choices=["IN_PROGRESS", "COMPLETED", "SKIPPED", "FAILED"])
    observations = serializers.CharField(required=False, allow_blank=True)
    reagent_lot_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list,
    )
    instrument_id = serializers.UUIDField(required=False)


class AddSamplesToRunSerializer(serializers.Serializer):
    """Add samples to an existing run."""
    samples = serializers.ListField(child=serializers.UUIDField())
    assignments = serializers.ListField(child=serializers.DictField(), required=False)

"""QC serializers."""
from rest_framework import serializers
from .models import QCControlMaterial, QCRun, QCChart, QCEvent


class QCControlMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCControlMaterial
        fields = "__all__"


class QCRunSerializer(serializers.ModelSerializer):
    run_number = serializers.CharField(source="run.run_number", read_only=True)

    class Meta:
        model = QCRun
        fields = "__all__"
        read_only_fields = ["reviewed_by", "reviewed_at"]


class QCRunCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCRun
        fields = ["run", "control_material", "measured_values", "pass_fail", "westgard_violations", "notes"]


class QCChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCChart
        fields = "__all__"


class QCChartDataSerializer(QCChartSerializer):
    """Chart data with historical points for Levey-Jennings."""
    data_points = serializers.SerializerMethodField()

    def get_data_points(self, obj):
        from .models import QCRun
        qc_runs = QCRun.objects.filter(
            control_material=obj.control_material,
            run__panel=obj.panel,
        ).order_by("created_at")[:50]
        points = []
        for run in qc_runs:
            val = run.measured_values.get(obj.metric_name)
            if val is not None:
                points.append({
                    "date": run.created_at.isoformat(),
                    "value": float(val),
                    "run_number": run.run.run_number,
                    "pass_fail": run.pass_fail,
                })
        return points


class QCEventSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()
    affected_samples = serializers.ListField(required=False)

    class Meta:
        model = QCEvent
        fields = "__all__"
        read_only_fields = ["reported_by", "assigned_to", "resolved_by", "resolved_at"]

    def get_reported_by_name(self, obj):
        return f"{obj.reported_by}" if obj.reported_by else None

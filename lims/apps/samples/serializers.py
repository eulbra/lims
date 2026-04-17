"""Sample serializers."""
import datetime
from rest_framework import serializers
from .models import Sample, SampleType, TestPanel, SampleMovement, SampleAliquot


class SampleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleType
        fields = ["id", "code", "name", "collection_tube", "storage_temp", "retention_days", "is_active"]


class TestPanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestPanel
        fields = ["id", "code", "name", "description", "turnaround_days", "report_template_code", "is_active"]


class SampleSerializer(serializers.ModelSerializer):
    """Detailed sample serializer."""
    sample_type = SampleTypeSerializer(read_only=True)
    sample_type_id = serializers.UUIDField(write_only=True)
    site_id = serializers.SerializerMethodField()
    movements_count = serializers.SerializerMethodField()

    class Meta:
        model = Sample
        fields = "__all__"
        read_only_fields = ["barcode", "transport_time_days", "status", "site", "created_by"]

    def get_site_id(self, obj):
        return str(obj.site_id) if obj.site else None

    def get_movements_count(self, obj):
        return obj.movements.count()

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        validated_data["site"] = user.site or self._get_default_site()
        # Auto-generate barcode if not provided
        if not validated_data.get("barcode"):
            validated_data["barcode"] = self._generate_barcode()
        return super().create(validated_data)

    def _generate_barcode(self):
        today = datetime.date.today().strftime("%Y%m%d")
        count = Sample.objects.filter(barcode__startswith=f"SMP-{today}").count() + 1
        return f"SMP-{today}-{count:04d}"

    def _get_default_site(self):
        """Get first available site for users without site assignment (e.g. super admins)."""
        from lims.apps.organizations.models import Site
        return Site.objects.filter(is_active=True).first()


class SampleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    sample_type_code = serializers.CharField(source="sample_type.code", read_only=True)
    panel_info = serializers.SerializerMethodField()

    class Meta:
        model = Sample
        fields = ["id", "barcode", "sample_type_code", "patient_id", "status",
                   "receipt_date", "collection_date", "panel_info", "created_at"]

    def get_panel_info(self, obj):
        # Get the most recent run/panel for this sample
        run_sample = obj.run_samples.first()
        if run_sample:
            return run_sample.run.panel.code
        return None


class SampleReceiveSerializer(serializers.Serializer):
    """Serializer for sample receipt (create + auto-barcode)."""
    sample_type_id = serializers.UUIDField()
    patient_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    patient_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    patient_dob = serializers.DateField(required=False, allow_null=True)
    patient_sex = serializers.CharField(max_length=1, required=False, allow_blank=True)
    ordering_physician = serializers.CharField(max_length=200, required=False, allow_blank=True)
    ordering_facility = serializers.CharField(max_length=200, required=False, allow_blank=True)
    collection_date = serializers.DateField()
    collection_time = serializers.TimeField(required=False, allow_null=True)
    receipt_temp = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    consent_given = serializers.BooleanField(required=False, allow_null=True)

    def create(self, validated_data):
        user = self.context["request"].user
        now = datetime.datetime.now()
        validated_data["created_by"] = user
        validated_data["site"] = user.site or self._get_default_site()
        # Auto-generate barcode
        validated_data["barcode"] = self._generate_barcode()
        # Set receipt date/time defaults
        if "receipt_date" not in validated_data:
            validated_data["receipt_date"] = now.date()
        if "receipt_time" not in validated_data:
            validated_data["receipt_time"] = now.time()
        return Sample.objects.create(**validated_data)

    def _generate_barcode(self):
        today = datetime.date.today().strftime("%Y%m%d")
        count = Sample.objects.filter(barcode__startswith=f"SMP-{today}").count() + 1
        return f"SMP-{today}-{count:04d}"

    def _get_default_site(self):
        """Get first available site for users without site assignment (e.g. super admins)."""
        from lims.apps.organizations.models import Site
        return Site.objects.filter(is_active=True).first()


class SampleRejectSerializer(serializers.Serializer):
    """Reject a sample with reason."""
    rejection_reason = serializers.CharField(max_length=100)
    rejection_note = serializers.CharField(required=False)


class SampleMovementSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SampleMovement
        fields = ["id", "from_location", "to_location", "reason", "performed_by_name", "performed_at", "notes"]
        read_only_fields = ["performed_by", "performed_at"]

    def get_performed_by_name(self, obj):
        return f"{obj.performed_by.first_name} {obj.performed_by.last_name}" if obj.performed_by else None

    def create(self, validated_data):
        validated_data["performed_by"] = self.context["request"].user
        return super().create(validated_data)


class SampleAliquotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleAliquot
        fields = ["id", "parent_sample", "child_sample", "aliquot_type", "volume_ml", "barcode", "created_at"]
        read_only_fields = ["created_at"]

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
        fields = [
            "id", "barcode", "additional_barcodes", "sample_type", "sample_type_id",
            "patient_id", "patient_name", "patient_dob", "patient_sex",
            "ordering_physician", "ordering_facility",
            "collection_date", "collection_time",
            "receipt_date", "receipt_time", "receipt_temp", "transport_time_days",
            "status", "rejection_reason", "rejection_note",
            "consent_given", "consent_date",
            "site", "site_id", "created_by", "created_at", "updated_at", "is_deleted",
            "movements_count",
        ]
        read_only_fields = ["barcode", "transport_time_days", "status", "site", "created_by", "movements_count"]

    def get_site_id(self, obj):
        return str(obj.site_id) if obj.site else None

    def get_movements_count(self, obj):
        return obj.movements.count()

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        user_site = getattr(user, 'site', None)
        validated_data["site"] = user_site if user_site else self._get_default_site()
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
    patient_name = serializers.CharField(read_only=True)

    class Meta:
        model = Sample
        fields = ["id", "barcode", "sample_type_code", "patient_id", "patient_name", "status",
                   "receipt_date", "collection_date", "panel_info", "created_at"]

    def get_panel_info(self, obj):
        if obj.panel_id:
            return obj.panel.code if obj.panel else None
        # Fallback: get the most recent run/panel for this sample
        run_sample = obj.run_samples.first()
        if run_sample:
            return run_sample.run.panel.code
        return None


class SampleReceiveSerializer(serializers.ModelSerializer):
    """Serializer for sample receipt (create + auto-barcode)."""
    sample_type_id = serializers.UUIDField(write_only=True)
    panel_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Sample
        fields = [
            "sample_type_id", "panel_id", "patient_id", "patient_name", "patient_dob",
            "patient_sex", "ordering_physician", "ordering_facility",
            "collection_date", "collection_time", "receipt_temp", "consent_given",
            "receipt_date", "receipt_time",
        ]
        extra_kwargs = {
            "collection_date": {"required": False},
            "collection_time": {"required": False, "allow_null": True},
            "receipt_date": {"required": False},
            "receipt_time": {"required": False},
            "patient_dob": {"required": False, "allow_null": True},
            "patient_sex": {"required": False, "allow_blank": True},
            "ordering_physician": {"required": False, "allow_blank": True},
            "ordering_facility": {"required": False, "allow_blank": True},
            "receipt_temp": {"required": False, "allow_blank": True},
            "consent_given": {"required": False, "allow_null": True},
        }

    def create(self, validated_data):
        user = self.context["request"].user
        now = datetime.datetime.now()

        # Pop write-only fields
        sample_type_id = validated_data.pop("sample_type_id", None)
        panel_id = validated_data.pop("panel_id", None)

        # Set receipt date/time defaults if not provided
        if "receipt_date" not in validated_data or validated_data.get("receipt_date") is None:
            validated_data["receipt_date"] = now.date()
        if "receipt_time" not in validated_data or validated_data.get("receipt_time") is None:
            validated_data["receipt_time"] = now.time()

        # Auto-generate barcode
        validated_data["barcode"] = self._generate_barcode()

        # Set site from user
        user_site = getattr(user, 'site', None)
        validated_data["site"] = user_site if user_site else self._get_default_site()
        validated_data["created_by"] = user

        # Create sample with sample_type_id passed directly to the FK
        if panel_id:
            validated_data["panel_id"] = panel_id
        return Sample.objects.create(sample_type_id=sample_type_id, **validated_data)

    def _generate_barcode(self):
        today = datetime.date.today().strftime("%Y%m%d")
        count = Sample.objects.filter(barcode__startswith=f"SMP-{today}").count() + 1
        return f"SMP-{today}-{count:04d}"

    def _get_default_site(self):
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

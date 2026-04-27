"""Order serializers."""
import datetime
from rest_framework import serializers
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    sample_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ["order_number", "site", "created_by"]

    def get_sample_id(self, obj):
        return None  # Samples linked via workflow


class OrderCreateSerializer(serializers.ModelSerializer):
    sample_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            "panel", "sample_id", "ordering_physician", "ordering_facility",
            "patient_id", "patient_name", "patient_dob", "patient_sex",
            "urgency", "clinical_notes",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        sample_id = validated_data.pop("sample_id", None)
        sample = None
        if sample_id:
            from lims.apps.samples.models import Sample
            try:
                sample = Sample.objects.get(id=sample_id)
                validated_data.setdefault("patient_id", sample.patient_id)
                validated_data.setdefault("patient_name", sample.patient_name)
                validated_data.setdefault("patient_dob", sample.patient_dob)
                validated_data.setdefault("patient_sex", sample.patient_sex)
                validated_data.setdefault("ordering_physician", sample.ordering_physician)
                validated_data.setdefault("ordering_facility", sample.ordering_facility)
            except Sample.DoesNotExist:
                pass
        validated_data["site"] = user.site or self._get_default_site()
        validated_data["created_by"] = user
        # Auto-generate order_number
        now = datetime.datetime.now()
        today = now.date()
        prefix = f"ORD-{today.strftime('%Y%m%d')}"
        count = Order.objects.filter(order_number__startswith=prefix).count() + 1
        validated_data["order_number"] = f"{prefix}-{count:04d}"
        order = Order.objects.create(**validated_data)
        if sample:
            order.sample = sample
            order.save(update_fields=["sample"])
        return order

    def _get_default_site(self):
        from lims.apps.organizations.models import Site
        return Site.objects.filter(is_active=True).first()


class OrderListSerializer(serializers.ModelSerializer):
    panel_code = serializers.CharField(source="panel.code", read_only=True)
    panel_name = serializers.CharField(source="panel.name", read_only=True)
    sample_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "panel_code", "panel_name", "sample_id",
            "patient_id", "patient_name", "status", "urgency",
            "created_at",
        ]

    def get_sample_id(self, obj):
        return str(obj.sample_id) if obj.sample_id else None

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
    class Meta:
        model = Order
        fields = [
            "panel", "ordering_physician", "ordering_facility",
            "patient_id", "patient_name", "patient_dob", "patient_sex",
            "urgency", "clinical_notes",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["site"] = user.site or self._get_default_site()
        validated_data["created_by"] = user
        # Auto-generate order_number
        now = datetime.datetime.now()
        today = now.date()
        prefix = f"ORD-{today.strftime('%Y%m%d')}"
        count = Order.objects.filter(order_number__startswith=prefix).count() + 1
        validated_data["order_number"] = f"{prefix}-{count:04d}"
        return Order.objects.create(**validated_data)

    def _get_default_site(self):
        from lims.apps.organizations.models import Site
        return Site.objects.filter(is_active=True).first()


class OrderListSerializer(serializers.ModelSerializer):
    panel_code = serializers.CharField(source="panel.code", read_only=True)
    panel_name = serializers.CharField(source="panel.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "panel_code", "panel_name",
            "patient_id", "patient_name", "status", "urgency",
            "created_at",
        ]

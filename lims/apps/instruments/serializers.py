"""Instrument serializers."""
from rest_framework import serializers
from .models import Instrument, InstrumentMaintenance


class InstrumentSerializer(serializers.ModelSerializer):
    maintenance_count = serializers.SerializerMethodField()

    class Meta:
        model = Instrument
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "site"]

    def get_maintenance_count(self, obj):
        return obj.maintenance_logs.count()


class InstrumentMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstrumentMaintenance
        fields = "__all__"
        read_only_fields = ["created_at"]

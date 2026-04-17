"""Reagent serializers."""
from rest_framework import serializers
from .models import Reagent, ReagentLot, InventoryTransaction


class ReagentSerializer(serializers.ModelSerializer):
    active_lots_count = serializers.SerializerMethodField()

    class Meta:
        model = Reagent
        fields = "__all__"
        read_only_fields = ["created_at"]

    def get_active_lots_count(self, obj):
        return obj.lots.filter(quality_status__in=["QC_PASSED", "IN_USE"]).count()


class ReagentLotSerializer(serializers.ModelSerializer):
    reagent_name = serializers.CharField(source="reagent.name", read_only=True)
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = ReagentLot
        fields = "__all__"
        read_only_fields = ["received_by"]

    def get_remaining(self, obj):
        received = obj.quantity_received or 0
        used = sum(t.quantity for t in obj.transactions.filter(transaction_type="USED"))
        return received - used


class ReagentLotCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReagentLot
        fields = ["reagent", "lot_number", "received_date", "expiry_date", "quantity_received", "unit", "storage_location"]


class InventoryTransactionSerializer(serializers.ModelSerializer):
    lot_info = serializers.StringRelatedField(source="lot")
    performer_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryTransaction
        fields = ["id", "lot", "lot_info", "transaction_type", "quantity", "unit",
                   "reference_type", "reference_id", "performer_name", "notes", "created_at"]
        read_only_fields = ["created_at"]

    def get_performer_name(self, obj):
        return f"{obj.performed_by}" if obj.performed_by else None

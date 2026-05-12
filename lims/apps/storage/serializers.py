"""Storage serializers."""
from rest_framework import serializers
from .models import StorageLocation, Box, BoxPosition


class StorageLocationSerializer(serializers.ModelSerializer):
    box_count = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = StorageLocation
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "site"]

    def get_box_count(self, obj):
        return obj.boxes.count()

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None


class BoxPositionSerializer(serializers.ModelSerializer):
    sample_barcode = serializers.SerializerMethodField()
    position_label = serializers.SerializerMethodField()

    class Meta:
        model = BoxPosition
        fields = "__all__"

    def get_sample_barcode(self, obj):
        return obj.sample.sample_id if obj.sample else None

    def get_position_label(self, obj):
        return obj.position_label()


class BoxSerializer(serializers.ModelSerializer):
    positions = BoxPositionSerializer(many=True, read_only=True)
    storage_location_name = serializers.SerializerMethodField()
    occupied_count = serializers.SerializerMethodField()

    class Meta:
        model = Box
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "site"]

    def get_storage_location_name(self, obj):
        return obj.storage_location.name if obj.storage_location else None

    def get_occupied_count(self, obj):
        return obj.positions.filter(sample__isnull=False).count()

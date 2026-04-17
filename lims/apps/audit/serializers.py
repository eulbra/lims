"""Audit serializers."""
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ["row_hash", "previous_hash", "timestamp"]


class AuditLogStatsSerializer(serializers.Serializer):
    by_action = serializers.ListField()
    by_entity_type = serializers.ListField()
    total_count = serializers.IntegerField()

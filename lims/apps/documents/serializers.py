
"""Documents serializers."""
from rest_framework import serializers
from .models import Document, DocumentAcknowledgment


class DocumentSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ["approved_by", "approved_at", "version"]

    def get_approved_by_name(self, obj):
        return f"{obj.approved_by}" if obj.approved_by else None


class DocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["doc_type", "title", "document_number", "file_path", "effective_date", "review_date"]

    def validate_document_number(self, value):
        qs = Document.objects.filter(document_number=value)
        if qs.exists():
            # allow same number different version
            pass
        return value


class DocumentAcknowledgeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAcknowledgment
        fields = ["id", "document", "user", "user_name", "acknowledged_at"]
        read_only_fields = ["user", "acknowledged_at"]

    def get_user_name(self, obj):
        return f"{obj.user}" if obj.user else None

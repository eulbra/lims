"""Library serializers."""
from rest_framework import serializers
from .models import IndexFamily, Index, LibraryDesign


class IndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = Index
        fields = "__all__"
        read_only_fields = ["created_at"]


class IndexFamilySerializer(serializers.ModelSerializer):
    indices = IndexSerializer(many=True, read_only=True)
    index_count = serializers.SerializerMethodField()

    class Meta:
        model = IndexFamily
        fields = "__all__"
        read_only_fields = ["created_at", "site"]

    def get_index_count(self, obj):
        return obj.indices.count()


class LibraryDesignSerializer(serializers.ModelSerializer):
    index_family_name = serializers.SerializerMethodField()

    class Meta:
        model = LibraryDesign
        fields = "__all__"
        read_only_fields = ["created_at", "site"]

    def get_index_family_name(self, obj):
        return obj.index_family.name if obj.index_family else None

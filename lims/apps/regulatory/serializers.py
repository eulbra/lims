from rest_framework import serializers
from .models import Jurisdiction, Category, Regulation, RegulationArticle, RegulatoryQALog


class JurisdictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Jurisdiction
        fields = ["id", "name_cn", "name_en", "name_pt", "level", "description_cn"]


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name_cn", read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "name_cn", "name_en", "name_pt", "code",
            "description_cn", "description_en", "description_pt",
            "parent", "parent_name", "children", "sort_order",
        ]

    def get_children(self, obj):
        if hasattr(obj, "children"):
            return CategorySerializer(obj.children.all(), many=True, read_only=True).data
        return []


class RegulationArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegulationArticle
        fields = [
            "id", "regulation", "parent_article", "article_number",
            "title_cn", "title_en", "title_pt",
            "content_cn", "content_en", "content_pt",
            "sort_order", "tags_cn",
        ]


class RegulationListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name_cn", read_only=True)
    jurisdiction_name = serializers.CharField(source="jurisdiction.name_cn", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    doc_type_label = serializers.CharField(source="get_doc_type_display", read_only=True)

    class Meta:
        model = Regulation
        fields = [
            "id", "regulation_number", "title_cn", "title_en", "title_pt",
            "category", "category_name", "jurisdiction", "jurisdiction_name",
            "doc_type", "doc_type_label", "issuing_authority_cn",
            "published_date", "effective_date", "status", "status_label",
            "summary_cn", "keywords_cn", "official_link",
            "created_at", "updated_at",
        ]


class RegulationDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    jurisdiction = JurisdictionSerializer(read_only=True)
    articles = RegulationArticleSerializer(many=True, read_only=True)
    related_regulations = RegulationListSerializer(many=True, read_only=True)
    amended_by = RegulationListSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    doc_type_label = serializers.CharField(source="get_doc_type_display", read_only=True)

    class Meta:
        model = Regulation
        fields = [
            "id", "regulation_number",
            "title_cn", "title_en", "title_pt",
            "category", "jurisdiction",
            "doc_type", "doc_type_label",
            "issuing_authority_cn", "issuing_authority_en", "issuing_authority_pt",
            "published_date", "effective_date", "revoked_date",
            "status", "status_label",
            "summary_cn", "summary_en", "summary_pt",
            "full_text_cn", "full_text_en", "full_text_pt",
            "official_link", "pdf_url",
            "keywords_cn", "keywords_en", "keywords_pt",
            "related_regulations", "amends", "amended_by",
            "articles",
            "created_at", "updated_at", "remark",
        ]


class RegulatoryQALogSerializer(serializers.ModelSerializer):
    referenced_regulations = RegulationListSerializer(many=True, read_only=True)
    referenced_articles = RegulationArticleSerializer(many=True, read_only=True)

    class Meta:
        model = RegulatoryQALog
        fields = [
            "id", "question_cn", "question_en", "question_pt",
            "answer_cn", "answer_en", "answer_pt",
            "referenced_regulations", "referenced_articles",
            "source", "confidence",
            "view_count", "helpful_count",
            "created_at", "updated_at",
        ]

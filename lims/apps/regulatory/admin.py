from django.contrib import admin
from .models import Jurisdiction, Category, Regulation, RegulationArticle, RegulatoryQALog


@admin.register(Jurisdiction)
class JurisdictionAdmin(admin.ModelAdmin):
    list_display = ["name_cn", "name_en", "level"]
    list_filter = ["level"]
    search_fields = ["name_cn", "name_en", "name_pt"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name_cn", "code", "parent", "sort_order"]
    list_filter = ["parent"]
    search_fields = ["name_cn", "name_en", "name_pt", "code"]
    ordering = ["sort_order", "code"]


class RegulationArticleInline(admin.TabularInline):
    model = RegulationArticle
    fields = ["article_number", "title_cn", "sort_order", "tags_cn"]
    extra = 0
    ordering = ["sort_order", "article_number"]


@admin.register(Regulation)
class RegulationAdmin(admin.ModelAdmin):
    list_display = [
        "regulation_number",
        "title_cn",
        "category",
        "jurisdiction",
        "doc_type",
        "status",
        "effective_date",
    ]
    list_filter = ["category", "jurisdiction", "doc_type", "status", "created_at"]
    search_fields = [
        "regulation_number",
        "title_cn", "title_en", "title_pt",
        "summary_cn", "keywords_cn",
    ]
    date_hierarchy = "effective_date"
    filter_horizontal = ["related_regulations"]
    inlines = [RegulationArticleInline]
    fieldsets = (
        ("基本信息", {
            "fields": (
                "regulation_number",
                ("title_pt", "title_en", "title_cn"),
                "category",
                "jurisdiction",
                "doc_type",
                "status",
            )
        }),
        ("发布与时效", {
            "fields": (
                "issuing_authority_pt", "issuing_authority_en", "issuing_authority_cn",
                "published_date", "effective_date", "revoked_date",
            )
        }),
        ("内容", {
            "fields": (
                "summary_pt", "summary_en", "summary_cn",
                "full_text_pt", "full_text_en", "full_text_cn",
            ),
            "classes": ("collapse",),
        }),
        ("关联", {
            "fields": (
                "official_link", "pdf_url",
                "keywords_pt", "keywords_en", "keywords_cn",
                "related_regulations", "amends",
            ),
        }),
        ("系统", {
            "fields": ("remark", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ["created_at", "updated_at"]


@admin.register(RegulationArticle)
class RegulationArticleAdmin(admin.ModelAdmin):
    list_display = ["regulation", "article_number", "title_cn", "sort_order"]
    list_filter = ["regulation__category", "regulation"]
    search_fields = ["title_cn", "title_en", "title_pt", "content_cn", "content_en", "content_pt"]
    ordering = ["regulation", "sort_order", "article_number"]


@admin.register(RegulatoryQALog)
class RegulatoryQALogAdmin(admin.ModelAdmin):
    list_display = ["question_cn", "source", "view_count", "helpful_count", "created_at"]
    list_filter = ["source", "created_at"]
    search_fields = ["question_cn", "answer_cn", "question_en", "answer_en"]
    readonly_fields = ["created_at", "updated_at"]
    filter_horizontal = ["referenced_regulations", "referenced_articles"]

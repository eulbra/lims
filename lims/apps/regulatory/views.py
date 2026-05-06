from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Jurisdiction, Category, Regulation, RegulationArticle, RegulatoryQALog
from .serializers import (
    JurisdictionSerializer,
    CategorySerializer,
    RegulationListSerializer,
    RegulationDetailSerializer,
    RegulationArticleSerializer,
    RegulatoryQALogSerializer,
)


class JurisdictionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Jurisdiction.objects.all()
    serializer_class = JurisdictionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.prefetch_related("children")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ["parent"]

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """返回分类树(只返回顶级分类，子分类嵌套)"""
        top = Category.objects.filter(parent__isnull=True).order_by("sort_order", "code")
        serializer = self.get_serializer(top, many=True)
        return Response(serializer.data)


class RegulationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Regulation.objects.select_related("category", "jurisdiction").prefetch_related(
        "articles", "related_regulations"
    )
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "jurisdiction", "doc_type", "status"]
    search_fields = [
        "regulation_number",
        "title_cn", "title_en", "title_pt",
        "summary_cn", "summary_en", "summary_pt",
        "keywords_cn", "keywords_en", "keywords_pt",
        "full_text_cn",
    ]
    ordering_fields = ["effective_date", "published_date", "created_at"]
    ordering = ["-effective_date"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RegulationDetailSerializer
        return RegulationListSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        全文搜索API: ?q=关键词&category=分类ID&doc_type=类型
        同时搜索标题、摘要、全文和关键词
        """
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"detail": "请提供搜索关键词q"}, status=status.HTTP_400_BAD_REQUEST)

        category = request.query_params.get("category")
        doc_type = request.query_params.get("doc_type")
        status_filter = request.query_params.get("status")

        queryset = Regulation.objects.select_related("category", "jurisdiction")

        # 多字段全文匹配
        queryset = queryset.filter(
            Q(title_cn__icontains=q)
            | Q(title_en__icontains=q)
            | Q(title_pt__icontains=q)
            | Q(summary_cn__icontains=q)
            | Q(summary_en__icontains=q)
            | Q(summary_pt__icontains=q)
            | Q(full_text_cn__icontains=q)
            | Q(keywords_cn__icontains=q)
            | Q(keywords_en__icontains=q)
            | Q(keywords_pt__icontains=q)
            | Q(regulation_number__icontains=q)
        )

        if category:
            queryset = queryset.filter(category_id=category)
        if doc_type:
            queryset = queryset.filter(doc_type=doc_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 条款级搜索也纳入结果高亮
        article_matches = RegulationArticle.objects.filter(
            Q(title_cn__icontains=q)
            | Q(title_en__icontains=q)
            | Q(title_pt__icontains=q)
            | Q(content_cn__icontains=q)
            | Q(content_en__icontains=q)
            | Q(content_pt__icontains=q)
            | Q(tags_cn__icontains=q)
        ).values_list("regulation_id", flat=True)

        if article_matches:
            queryset = queryset.filter(Q(id__in=article_matches)).distinct()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = RegulationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = RegulationListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def articles(self, request, pk=None):
        """获取某法规的所有条款"""
        regulation = self.get_object()
        articles = regulation.articles.all().order_by("sort_order", "article_number")
        serializer = RegulationArticleSerializer(articles, many=True)
        return Response(serializer.data)


class RegulationArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RegulationArticle.objects.select_related("regulation")
    serializer_class = RegulationArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["regulation"]
    search_fields = ["title_cn", "title_en", "title_pt", "content_cn", "content_en", "content_pt", "tags_cn"]


class RegulatoryQALogViewSet(viewsets.ModelViewSet):
    queryset = RegulatoryQALog.objects.prefetch_related("referenced_regulations", "referenced_articles")
    serializer_class = RegulatoryQALogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["question_cn", "question_en", "question_pt", "answer_cn", "answer_en", "answer_pt"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=["post"])
    def mark_helpful(self, request, pk=None):
        qa = self.get_object()
        qa.helpful_count += 1
        qa.save(update_fields=["helpful_count"])
        return Response({"helpful_count": qa.helpful_count})

    @action(detail=False, methods=["get"])
    def popular(self, request):
        """返回热门问答"""
        popular_qa = self.get_queryset().order_by("-view_count")[:20]
        serializer = self.get_serializer(popular_qa, many=True)
        return Response(serializer.data)

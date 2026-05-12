"""Library views."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import IndexFamily, Index, LibraryDesign
from .serializers import IndexFamilySerializer, IndexSerializer, LibraryDesignSerializer


class IndexFamilyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = IndexFamilySerializer

    def get_queryset(self):
        qs = IndexFamily.objects.prefetch_related("indices").all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        serializer.save(site=site)

    @action(detail=True, methods=["post"], url_path="add-index")
    def add_index(self, request, pk=None):
        family = self.get_object()
        serializer = IndexSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(family=family)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class IndexViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = IndexSerializer

    def get_queryset(self):
        qs = Index.objects.select_related("family").all()
        if self.request.user.site_id:
            qs = qs.filter(family__site=self.request.user.site)
        return qs


class LibraryDesignViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LibraryDesignSerializer

    def get_queryset(self):
        qs = LibraryDesign.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        serializer.save(site=site)

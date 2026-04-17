"""QC views."""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import QCControlMaterial, QCRun, QCChart, QCEvent
from .serializers import (
    QCControlMaterialSerializer, QCRunSerializer, QCChartSerializer, QCEventSerializer,
)


class QCControlMaterialViewSet(viewsets.ModelViewSet):
    """Manage QC control materials."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QCControlMaterialSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["material_type"]

    def get_queryset(self):
        qs = QCControlMaterial.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs


class QCRunViewSet(viewsets.ModelViewSet):
    """Manage QC runs with Westgard rule evaluation."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QCRunSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["pass_fail", "control_material", "run"]

    def get_queryset(self):
        qs = QCRun.objects.select_related("run", "control_material")
        if self.request.user.site_id:
            qs = qs.filter(run__site=self.request.user.site)
        return qs


class QCChartViewSet(viewsets.ModelViewSet):
    """Levey-Jennings chart data."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QCChartSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    def get_queryset(self):
        qs = QCChart.objects.select_related("panel", "control_material")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        if self.request.user.site_id:
            serializer.save(site=self.request.user.site)
        else:
            serializer.save()


class QCEventViewSet(viewsets.ModelViewSet):
    """CAPA events for QC issues."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QCEventSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "severity"]

    def get_queryset(self):
        qs = QCEvent.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        event = self.get_object()
        new_status = request.data.get("status", "")
        if new_status not in dict(QCEvent.STATUS_CHOICES):
            raise ValidationError("Invalid status")
        event.status = new_status
        event.save(update_fields=["status"])
        return Response({"status": new_status})

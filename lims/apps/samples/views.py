"""Sample management views."""
from datetime import date
from django.db import transaction
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Sample, SampleType, TestPanel, SampleMovement
from .serializers import (
    SampleSerializer, SampleListSerializer, SampleReceiveSerializer,
    SampleRejectSerializer, SampleMovementSerializer, SampleTypeSerializer, TestPanelSerializer,
)
from lims.core.permissions import IsSiteScoped


class SampleViewSet(viewsets.ModelViewSet):
    """CRUD + actions for samples."""
    permission_classes = [IsAuthenticated, IsSiteScoped]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "sample_type", "receipt_date", "panel"]
    search_fields = ["barcode", "patient_id", "patient_name"]
    ordering_fields = ["receipt_date", "created_at", "barcode"]

    def get_queryset(self):
        qs = Sample.objects.filter(is_deleted=False)
        # 默认排除终态样本，除非明确指定了 status 过滤
        if "status" not in self.request.query_params:
            qs = qs.exclude(status__in=["REJECTED", "ARCHIVED", "DISPOSED"])
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs.select_related("sample_type", "site").prefetch_related("movements", "run_samples")

    def get_serializer_class(self):
        if self.action == "list":
            return SampleListSerializer
        if self.action == "create":
            return SampleReceiveSerializer
        return SampleSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Receive a new sample."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample = serializer.save()

        # Log movement
        SampleMovement.objects.create(
            sample=sample,
            to_location="RECEIVING",
            reason="RECEIPT",
            performed_by=request.user,
        )
        return Response(SampleSerializer(sample).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a sample."""
        sample = self.get_object()
        serializer = SampleRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample.status = "REJECTED"
        sample.rejection_reason = serializer.validated_data["rejection_reason"]
        sample.rejection_note = serializer.validated_data.get("rejection_note", "")
        sample.save(update_fields=["status", "rejection_reason", "rejection_note", "updated_at"])

        SampleMovement.objects.create(
            sample=sample, to_location="REJECTED",
            reason="REJECTION", performed_by=request.user,
        )
        return Response({"status": "REJECTED", "barcode": sample.barcode})

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Accept a sample."""
        sample = self.get_object()
        sample.status = "ACCEPTED"
        sample.save(update_fields=["status", "updated_at"])
        return Response({"status": "ACCEPTED", "barcode": sample.barcode})

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        """Record sample movement."""
        sample = self.get_object()
        serializer = SampleMovementSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        movement = serializer.save()
        return Response(SampleMovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get sample statistics for dashboard."""
        today = date.today()
        qs = self.get_queryset()
        stats = {
            "total_received_today": qs.filter(receipt_date=today).count(),
            "total_in_process": qs.filter(status="IN_PROCESS").count(),
            "total_completed": qs.filter(status="COMPLETED").count(),
            "total_reported": qs.filter(status="REPORTED").count(),
            "total_rejected_today": qs.filter(receipt_date=today, status="REJECTED").count(),
        }
        return Response(stats)


class SampleTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """List sample types."""
    permission_classes = [IsAuthenticated]
    serializer_class = SampleTypeSerializer
    queryset = SampleType.objects.filter(is_active=True)


class TestPanelViewSet(viewsets.ReadOnlyModelViewSet):
    """List available test panels."""
    permission_classes = [IsAuthenticated]
    serializer_class = TestPanelSerializer

    def get_queryset(self):
        return TestPanel.objects.filter(is_active=True)

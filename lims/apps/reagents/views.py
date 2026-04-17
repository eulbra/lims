"""Reagent views."""
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Reagent, ReagentLot, InventoryTransaction
from .serializers import (
    ReagentSerializer, ReagentLotSerializer, ReagentLotCreateSerializer,
    InventoryTransactionSerializer,
)


class ReagentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReagentSerializer

    def get_queryset(self):
        qs = Reagent.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs


class ReagentLotViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReagentLotSerializer

    def get_queryset(self):
        qs = ReagentLot.objects.select_related("reagent")
        if self.request.user.site_id:
            qs = qs.filter(reagent__site=self.request.user.site)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ReagentLotCreateSerializer
        return ReagentLotSerializer

    @transaction.atomic
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lot = serializer.save(received_by=request.user)
        # Auto-create RECEIVED transaction
        InventoryTransaction.objects.create(
            lot=lot, transaction_type="RECEIVED",
            quantity=lot.quantity_received, unit=lot.unit,
            performed_by=request.user,
        )
        return Response(ReagentLotSerializer(lot).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        """Lots expiring within N days (default 30)."""
        days = int(request.query_params.get("days", 30))
        cutoff = timezone.now().date() + timedelta(days=days)
        lots = self.get_queryset().filter(
            expiry_date__lte=cutoff,
            expiry_date__isnull=False,
            quality_status__in=["QC_PASSED", "IN_USE"],
        )
        return Response(ReagentLotSerializer(lots, many=True).data)


class InventoryTransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InventoryTransactionSerializer

    def get_queryset(self):
        qs = InventoryTransaction.objects.select_related("lot__reagent")
        if self.request.user.site_id:
            qs = qs.filter(lot__reagent__site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)

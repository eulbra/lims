"""Quality views — PT/EQA and Internal Audit."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.utils import timezone
from .models import PTProgram, PTRound, InternalAudit
from .serializers import PTProgramSerializer, PTRoundSerializer, InternalAuditSerializer


class PTProgramViewSet(viewsets.ModelViewSet):
    """Manage PT/EQA programs."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PTProgramSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "provider"]

    def get_queryset(self):
        qs = PTProgram.objects.select_related("created_by")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        program = self.get_object()
        if program.status != "DRAFT":
            raise ValidationError("Only drafts can be submitted")
        program.status = "SUBMITTED"
        program.submitted_at = timezone.now()
        program.submitted_by = request.user
        program.save(update_fields=["status", "submitted_at", "submitted_by"])
        return Response({"status": "SUBMITTED"})


class PTRoundViewSet(viewsets.ModelViewSet):
    """Manage PT/EQA rounds within programs."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PTRoundSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]

    def get_queryset(self):
        qs = PTRound.objects.select_related("program", "coordinator")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def record_result(self, request, pk=None):
        p_round = self.get_object()
        result = request.data.get("result", "")
        if not result:
            raise ValidationError("Result is required")
        p_round.result = result
        p_round.result_recorded_at = timezone.now()
        p_round.save(update_fields=["result", "result_recorded_at"])
        return Response({"result": result, "recorded_at": p_round.result_recorded_at.isoformat()})

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        p_round = self.get_object()
        if p_round.status != "DRAFT":
            raise ValidationError("Only drafts can be submitted")
        p_round.status = "SUBMITTED"
        p_round.submitted_at = timezone.now()
        p_round.save(update_fields=["status", "submitted_at"])
        return Response({"status": "SUBMITTED"})


class InternalAuditViewSet(viewsets.ModelViewSet):
    """Manage internal audits."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalAuditSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["title", "scope"]
    filterset_fields = ["status"]

    def get_queryset(self):
        qs = InternalAudit.objects.select_related("auditor")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        audit = self.get_object()
        if audit.status != "IN_PROGRESS":
            raise ValidationError("Only in-progress audits can be completed")
        audit.status = "COMPLETED"
        audit.completed_at = timezone.now()
        audit.auditor = request.user
        audit.save(update_fields=["status", "completed_at", "auditor"])
        return Response({"status": "COMPLETED"})

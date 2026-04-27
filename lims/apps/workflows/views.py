"""Workflow views."""
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date
from .models import WorkflowProtocol, SampleRun, RunSample, WorkflowStep
from .serializers import (
    WorkflowProtocolSerializer, RunSampleSerializer,
    SampleRunSerializer, SampleRunCreateSerializer, SampleRunDetailSerializer,
    WorkflowStepSerializer,
)


class WorkflowProtocolViewSet(viewsets.ModelViewSet):
    """Manage workflow protocols."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkflowProtocolSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    filterset_fields = ["is_active"]


class SampleRunViewSet(viewsets.ModelViewSet):
    """Manage sequencing runs."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["run_number"]
    filterset_fields = ["status", "panel"]
    ordering_fields = ["created_at", "planned_date"]

    def get_queryset(self):
        qs = SampleRun.objects.all().select_related("panel", "sequencer", "operator")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return SampleRunCreateSerializer
        if self.action in ["retrieve", "detail"]:
            return SampleRunDetailSerializer
        return SampleRunSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from lims.apps.samples.models import Sample
        from lims.apps.organizations.models import Site

        user = request.user
        site = user.site if user.site_id else Site.objects.filter(is_active=True).first()

        # Generate run number
        from datetime import date
        today = date.today().strftime("%Y%m%d")
        prefix = f"RUN-{today}"
        count = SampleRun.objects.filter(run_number__startswith=prefix).count() + 1
        run_number = f"{prefix}-{count:04d}"

        run = SampleRun.objects.create(
            run_number=run_number,
            panel_id=data["panel"],
            protocol_id=data.get("protocol"),
            sequencer_id=data.get("sequencer"),
            planned_date=data.get("planned_date"),
            notes=data.get("notes", ""),
            site=site,
            operator=user,
        )

        sample_ids = data.get("samples", [])
        for sid in sample_ids:
            RunSample.objects.get_or_create(run=run, sample_id=sid)
            # Update sample status to IN_PROCESS
            Sample.objects.filter(id=sid).update(status="IN_PROCESS")

        return Response(SampleRunSerializer(run).data, status=201)

    @action(detail=True, methods=["get"])
    def detail(self, request, pk=None):
        """Get run with all steps and samples."""
        run = self.get_object()
        serializer = SampleRunDetailSerializer(run)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_samples(self, request, pk=None):
        """Add samples to a run."""
        run = self.get_object()
        sample_ids = request.data.get("sample_ids", [])
        added = []
        for sid in sample_ids:
            _, created = RunSample.objects.get_or_create(run=run, sample_id=sid)
            if created:
                added.append(sid)
        return Response({"added": len(added), "sample_ids": added})

    @action(detail=True, methods=["post"])
    def advance_status(self, request, pk=None):
        """Advance run to next status."""
        run = self.get_object()
        new_status = request.data.get("status", "")
        valid_statuses = dict(SampleRun._meta.get_field("status").choices)
        if new_status not in valid_statuses:
            raise ValidationError(f"Invalid status. Choices: {list(valid_statuses.keys())}")
        run.status = new_status
        run.save(update_fields=["status", "updated_at"])

        # Cascade status to linked samples
        from lims.apps.samples.models import Sample
        if new_status == "COMPLETED":
            sample_ids = run.run_samples.values_list("sample_id", flat=True)
            Sample.objects.filter(id__in=sample_ids).update(status="COMPLETED")
        elif new_status == "FAILED":
            sample_ids = run.run_samples.values_list("sample_id", flat=True)
            Sample.objects.filter(id__in=sample_ids).update(status="REJECTED")

        return Response({"status": new_status, "run_number": run.run_number})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Run statistics."""
        qs = self.get_queryset()
        stats = {s: qs.filter(status=s).count() for s, _ in SampleRun._meta.get_field("status").choices}
        stats["total"] = qs.count()
        return Response(stats)


class WorkflowStepViewSet(viewsets.ModelViewSet):
    """Individual workflow steps within a run."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkflowStepSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "run"]
    ordering_fields = ["step_order"]

    def get_queryset(self):
        qs = WorkflowStep.objects.all().select_related("run", "sample", "performed_by", "instrument")
        if self.request.user.site_id:
            qs = qs.filter(run__site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        step = self.get_object()
        step.status = "COMPLETED"
        from django.utils import timezone
        step.completed_at = timezone.now()
        step.performed_by = request.user
        step.save(update_fields=["status", "completed_at", "performed_by"])
        return Response({"status": "COMPLETED"})

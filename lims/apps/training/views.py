"""Training views."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.db.models import Count, Q, Max
from django.utils import timezone
from .models import TrainingRecord, CompetencyAssessment
from .serializers import TrainingRecordSerializer, CompetencyAssessmentSerializer


class TrainingRecordViewSet(viewsets.ModelViewSet):
    """Track employee training records."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TrainingRecordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ["topic"]
    filterset_fields = ["training_type"]

    def get_queryset(self):
        qs = TrainingRecord.objects.select_related("user")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=False, methods=["get"])
    def overdue(self, request):
        """List overdue training records (past due_date and not completed)."""
        qs = self.get_queryset().filter(
            due_date__lt=timezone.now().date(),
            completed_at=None
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class CompetencyAssessmentViewSet(viewsets.ModelViewSet):
    """Manage competency assessments (CAP 6 types)."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompetencyAssessmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ["assessment_type", "notes"]

    def get_queryset(self):
        qs = CompetencyAssessment.objects.select_related("user", "assessor")
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Competency statistics."""
        qs = self.get_queryset()
        result = {
            "total": qs.count(),
            "pass": qs.filter(result="PASS").count(),
            "fail": qs.filter(result="FAIL").count(),
            "needs_improvement": qs.filter(result="NEEDS_IMPROVEMENT").count(),
        }
        return Response(result)

    @action(detail=False, methods=["get"])
    def overdue(self, request):
        """List overdue competency assessments — returns overdue training records for reference."""
        from lims.apps.training.models import TrainingRecord
        from django.utils import timezone
        overdue = TrainingRecord.objects.filter(
            site=self.get_queryset().first().site if self.get_queryset().exists() else None,
            due_date__lt=timezone.now().date(),
            completed_at=None
        ).select_related("user")[:20]
        return Response({"overdue_training": True, "count": overdue.count()})

    @action(detail=False, methods=["get"])
    def mine(self, request):
        """List current user's training/assessments."""
        qs = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def competency_summary(self, request):
        """Aggregated competency summary per user."""
        qs = self.get_queryset()
        summary = qs.values(
            "user__username",
            "user__first_name",
            "user__last_name",
        ).annotate(
            total=Count("id"),
            passed=Count("id", filter=Q(result="PASS")),
            failed=Count("id", filter=Q(result="FAIL")),
            needs_improvement=Count("id", filter=Q(result="NEEDS_IMPROVEMENT")),
            last_assessment=Max("assessment_date"),
        ).order_by("user__username")
        return Response(list(summary))

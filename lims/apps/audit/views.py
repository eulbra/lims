"""Audit views."""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail — no creation/deletion allowed."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogSerializer
    filter_backends = []
    ordering_fields = ["timestamp"]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site_id=self.request.user.site_id)
        return qs

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Audit statistics."""
        by_action = list(
            self.get_queryset().values("action").annotate(count=Count("id")).order_by("-count")
        )
        by_entity = list(
            self.get_queryset().values("entity_type").annotate(count=Count("id")).order_by("-count")
        )
        return Response({
            "total_count": self.get_queryset().count(),
            "by_action": by_action,
            "by_entity_type": by_entity,
        })

    @action(detail=False, methods=["post"])
    def verify_chain(self, request):
        """Verify audit chain integrity."""
        from .models import verify_audit_chain
        broken = verify_audit_chain()
        if broken:
            return Response(
                {"status": "BROKEN", "broken_indices": broken[:20]},
                status=status.HTTP_200_OK,
            )
        return Response({"status": "VALID", "message": "Chain integrity verified"})

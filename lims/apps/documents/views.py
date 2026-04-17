"""Documents views."""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.utils import timezone
from .models import Document, DocumentAcknowledgment
from .serializers import DocumentSerializer, DocumentCreateSerializer


class DocumentAcknowledgmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for document acknowledgments."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DocumentSerializer

    def get_queryset(self):
        qs = DocumentAcknowledgment.objects.all().select_related("document", "user")
        if self.request.user.site_id:
            qs = qs.filter(document__site=self.request.user.site)
        return qs


class DocumentViewSet(viewsets.ModelViewSet):
    """Manage SOP documents with versioning."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ["status"]
    search_fields = ["title", "document_number"]
    ordering_fields = ["version", "created_at"]

    def get_queryset(self):
        qs = Document.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    @action(detail=True, methods=["post"])
    def submit_review(self, request, pk=None):
        doc = self.get_object()
        if doc.status != "DRAFT":
            raise ValidationError("Only drafts can be submitted for review")
        doc.status = "IN_REVIEW"
        doc.submitted_at = timezone.now()
        doc.submitted_by = request.user
        doc.save(update_fields=["status", "submitted_at", "submitted_by"])
        return Response({"status": "IN_REVIEW"})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        doc = self.get_object()
        if doc.status != "IN_REVIEW":
            raise ValidationError("Only documents under review can be approved")
        doc.status = "APPROVED"
        doc.approved_by = request.user
        doc.approved_at = timezone.now()
        doc.save(update_fields=["status", "approved_by", "approved_at"])
        return Response({"status": "APPROVED"})

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        doc = self.get_object()
        if doc.status != "APPROVED":
            raise ValidationError("Only approved documents can be published")
        doc.status = "PUBLISHED"
        doc.published_at = timezone.now()
        doc.published_by = request.user
        doc.save(update_fields=["status", "published_by", "published_at"])
        return Response({"status": "PUBLISHED"})

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Acknowledge reading a document."""
        doc = self.get_object()
        ack, created = DocumentAcknowledgment.objects.get_or_create(
            document=doc, user=request.user,
        )
        return Response({"acknowledged": True, "at": ack.acknowledged_at.isoformat()})

    @action(detail=True, methods=["post"])
    def supersede(self, request, pk=None):
        """Mark document as superseded by a new version."""
        doc = self.get_object()
        new_doc = Document.objects.create(
            title=doc.title,
            document_number=doc.document_number,
            site=doc.site,
            status="DRAFT",
            version=f"v{int(doc.version.replace('v', '')) + 1:02d}",
            parent=doc,
        )
        doc.status = "SUPERSEDED"
        doc.superseded_by = new_doc
        doc.save(update_fields=["status", "superseded_by"])
        return Response({"new_version": new_doc.id, "document_number": new_doc.document_number, "version": new_doc.version})

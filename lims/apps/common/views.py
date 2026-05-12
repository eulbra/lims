"""Common views — Attachment and Note."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from .models import Attachment, Note
from .serializers import AttachmentSerializer, NoteSerializer


class AttachmentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttachmentSerializer

    def get_queryset(self):
        qs = Attachment.objects.select_related("uploaded_by", "content_type").all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        # Filter by content object
        ct = self.request.query_params.get("content_type")
        oid = self.request.query_params.get("object_id")
        if ct and oid:
            qs = qs.filter(content_type__model=ct, object_id=oid)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        # Resolve content_type from string param
        ct_str = self.request.data.get("content_type_str", "")
        oid = self.request.data.get("object_id")
        if ct_str and oid:
            app_label, model = ct_str.split(".", 1)
            ct = ContentType.objects.get(app_label=app_label, model=model.lower())
            serializer.save(
                content_type=ct, object_id=oid,
                content_type_str=ct_str,
                uploaded_by=self.request.user, site=site
            )
        else:
            serializer.save(uploaded_by=self.request.user, site=site)


class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = Note.objects.select_related("author", "content_type").all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        ct = self.request.query_params.get("content_type")
        oid = self.request.query_params.get("object_id")
        if ct and oid:
            qs = qs.filter(content_type__model=ct, object_id=oid)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        ct_str = self.request.data.get("content_type_str", "")
        oid = self.request.data.get("object_id")
        if ct_str and oid:
            app_label, model = ct_str.split(".", 1)
            ct = ContentType.objects.get(app_label=app_label, model=model.lower())
            serializer.save(content_type=ct, object_id=oid, author=self.request.user, site=site)
        else:
            serializer.save(author=self.request.user, site=site)

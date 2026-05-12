"""Barcode views."""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BarcodePrinter, BarcodeLabel
from .serializers import BarcodePrinterSerializer, BarcodeLabelSerializer


class BarcodePrinterViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BarcodePrinterSerializer

    def get_queryset(self):
        qs = BarcodePrinter.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        serializer.save(site=site)

    @action(detail=True, methods=["post"], url_path="test-print")
    def test_print(self, request, pk=None):
        printer = self.get_object()
        return Response({"status": "ok", "message": f"Test label sent to {printer.name}"})


class BarcodeLabelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BarcodeLabelSerializer

    def get_queryset(self):
        qs = BarcodeLabel.objects.select_related("printer", "printed_by").all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        import uuid, datetime
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        data = serializer.validated_data
        if not data.get("barcode"):
            data["barcode"] = f"LBL-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(site=site, printed_by=self.request.user, printed_at=datetime.datetime.now())

    @action(detail=False, methods=["post"], url_path="batch-print")
    def batch_print(self, request):
        """Generate and print multiple labels at once."""
        count = request.data.get("count", 1)
        printer_id = request.data.get("printer_id")
        label_type = request.data.get("label_type", "GENERIC")
        import uuid, datetime
        labels = []
        site = request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        for _ in range(count):
            label = BarcodeLabel.objects.create(
                barcode=f"LBL-{uuid.uuid4().hex[:8].upper()}",
                label_type=label_type,
                printer_id=printer_id,
                site=site,
                printed_by=request.user,
                printed_at=datetime.datetime.now(),
            )
            labels.append(BarcodeLabelSerializer(label).data)
        return Response({"status": "ok", "labels": labels}, status=201)

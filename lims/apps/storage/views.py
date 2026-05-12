"""Storage views."""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StorageLocation, Box, BoxPosition
from .serializers import StorageLocationSerializer, BoxSerializer, BoxPositionSerializer


class StorageLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StorageLocationSerializer

    def get_queryset(self):
        qs = StorageLocation.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        serializer.save(site=site)


class BoxViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BoxSerializer

    def get_queryset(self):
        qs = Box.objects.prefetch_related("positions").all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = self.request.user.site or __import__("lims.apps.organizations.models", fromlist=["Site"]).Site.objects.filter(is_active=True).first()
        box = serializer.save(site=site)
        # Auto-create empty positions
        size = int(box.box_size.split("x")[0])
        from string import ascii_uppercase
        positions = []
        for r in range(size):
            for c in range(1, size + 1):
                positions.append(BoxPosition(box=box, row=ascii_uppercase[r], col=c))
        BoxPosition.objects.bulk_create(positions)

    @action(detail=True, methods=["post"], url_path="place-sample")
    def place_sample(self, request, pk=None):
        box = self.get_object()
        position_id = request.data.get("position_id")
        sample_id = request.data.get("sample_id")
        if not position_id:
            return Response({"error": "position_id required"}, status=400)
        pos = box.positions.filter(id=position_id).first()
        if not pos:
            return Response({"error": "Invalid position"}, status=404)
        if sample_id is None:
            pos.sample = None
            pos.occupied_at = None
        else:
            from lims.apps.samples.models import Sample
            sample = Sample.objects.filter(id=sample_id).first()
            if not sample:
                return Response({"error": "Sample not found"}, status=404)
            pos.sample = sample
            pos.occupied_at = __import__("django").utils.timezone.now()
        pos.save()
        return Response(BoxPositionSerializer(pos).data)

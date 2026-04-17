"""Instrument views."""
from rest_framework import viewsets, permissions
from .models import Instrument, InstrumentMaintenance
from .serializers import InstrumentSerializer, InstrumentMaintenanceSerializer


class InstrumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InstrumentSerializer

    def get_queryset(self):
        qs = Instrument.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs

    def perform_create(self, serializer):
        site = None
        if self.request.user.site_id:
            site = self.request.user.site
        else:
            from lims.apps.organizations.models import Site
            site = Site.objects.filter(is_active=True).first()
        serializer.save(site=site)


class InstrumentMaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InstrumentMaintenanceSerializer

    def get_queryset(self):
        qs = InstrumentMaintenance.objects.select_related("instrument")
        if self.request.user.site_id:
            qs = qs.filter(instrument__site=self.request.user.site)
        return qs

"""Instrument URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InstrumentViewSet, InstrumentMaintenanceViewSet

router = DefaultRouter()
router.register("", InstrumentViewSet, basename="instrument")
router.register("maintenance", InstrumentMaintenanceViewSet, basename="instrument-maintenance")

app_name = "instruments"

urlpatterns = [
    path("", include(router.urls)),
]

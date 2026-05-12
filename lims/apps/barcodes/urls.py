"""Barcode URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BarcodePrinterViewSet, BarcodeLabelViewSet

router = DefaultRouter()
router.register("printers", BarcodePrinterViewSet, basename="barcode-printer")
router.register("labels", BarcodeLabelViewSet, basename="barcode-label")

app_name = "barcodes"

urlpatterns = [
    path("", include(router.urls)),
]

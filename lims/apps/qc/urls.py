"""QC URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QCControlMaterialViewSet, QCRunViewSet, QCChartViewSet, QCEventViewSet

router = DefaultRouter()
router.register("control-materials", QCControlMaterialViewSet, basename="qc-material")
router.register("runs", QCRunViewSet, basename="qc-run")
router.register("charts", QCChartViewSet, basename="qc-chart")
router.register("events", QCEventViewSet, basename="qc-event")

app_name = "qc"

urlpatterns = [
    path("", include(router.urls)),
]

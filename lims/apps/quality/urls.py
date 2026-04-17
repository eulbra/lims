"""Quality URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PTProgramViewSet, PTRoundViewSet, InternalAuditViewSet

router = DefaultRouter()
router.register("programs", PTProgramViewSet, basename="pt-program")
router.register("rounds", PTRoundViewSet, basename="pt-round")
router.register("audits", InternalAuditViewSet, basename="internal-audit")

app_name = "quality"

urlpatterns = [
    path("", include(router.urls)),
]

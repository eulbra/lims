"""Documents URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentAcknowledgmentViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")
router.register("acknowledgments", DocumentAcknowledgmentViewSet, basename="doc-ack")

app_name = "documents"

urlpatterns = [
    path("", include(router.urls)),
]

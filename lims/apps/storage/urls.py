"""Storage URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StorageLocationViewSet, BoxViewSet

router = DefaultRouter()
router.register("locations", StorageLocationViewSet, basename="storage-location")
router.register("boxes", BoxViewSet, basename="storage-box")

app_name = "storage"

urlpatterns = [
    path("", include(router.urls)),
]

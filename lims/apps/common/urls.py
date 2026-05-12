"""Common URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttachmentViewSet, NoteViewSet

router = DefaultRouter()
router.register("attachments", AttachmentViewSet, basename="common-attachment")
router.register("notes", NoteViewSet, basename="common-note")

app_name = "common"

urlpatterns = [
    path("", include(router.urls)),
]

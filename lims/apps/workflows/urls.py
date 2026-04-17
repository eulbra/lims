"""Workflow URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowProtocolViewSet, SampleRunViewSet, WorkflowStepViewSet

router = DefaultRouter()
router.register("protocols", WorkflowProtocolViewSet, basename="protocol")
router.register("", SampleRunViewSet, basename="run")
router.register("steps", WorkflowStepViewSet, basename="step")

app_name = "workflows"

urlpatterns = [
    path("", include(router.urls)),
]

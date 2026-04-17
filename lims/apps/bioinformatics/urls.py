"""Bioinformatics URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineViewSet, PipelineValidationViewSet, AnalysisJobViewSet

router = DefaultRouter()
router.register("pipelines", PipelineViewSet, basename="pipeline")
router.register("validations", PipelineValidationViewSet, basename="pipeline-validation")
router.register("jobs", AnalysisJobViewSet, basename="analysis-job")

app_name = "bioinformatics"

urlpatterns = [
    path("", include(router.urls)),
]

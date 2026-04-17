"""Training URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrainingRecordViewSet, CompetencyAssessmentViewSet

router = DefaultRouter()
router.register("records", TrainingRecordViewSet, basename="training-record")
router.register("competencies", CompetencyAssessmentViewSet, basename="competency")

app_name = "training"

urlpatterns = [
    path("", include(router.urls)),
]

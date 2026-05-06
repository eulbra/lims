from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JurisdictionViewSet,
    CategoryViewSet,
    RegulationViewSet,
    RegulationArticleViewSet,
    RegulatoryQALogViewSet,
)

app_name = "regulatory"

router = DefaultRouter()
router.register(r"jurisdictions", JurisdictionViewSet, basename="jurisdiction")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"regulations", RegulationViewSet, basename="regulation")
router.register(r"articles", RegulationArticleViewSet, basename="article")
router.register(r"qa", RegulatoryQALogViewSet, basename="qa")

urlpatterns = [
    path("", include(router.urls)),
]

"""Sample URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SampleViewSet, SampleTypeViewSet, TestPanelViewSet

router = DefaultRouter()
router.register("", SampleViewSet, basename="sample")
router.register("types", SampleTypeViewSet, basename="sampletype")
router.register("panels", TestPanelViewSet, basename="testpanel")

app_name = "samples"

urlpatterns = [
    path("", include(router.urls)),
]

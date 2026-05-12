"""Library URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IndexFamilyViewSet, IndexViewSet, LibraryDesignViewSet

router = DefaultRouter()
router.register("index-families", IndexFamilyViewSet, basename="library-index-family")
router.register("indices", IndexViewSet, basename="library-index")
router.register("designs", LibraryDesignViewSet, basename="library-design")

app_name = "library"

urlpatterns = [
    path("", include(router.urls)),
]

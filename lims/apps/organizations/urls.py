"""Organization URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteViewSet, DepartmentViewSet

router = DefaultRouter()
router.register("sites", SiteViewSet, basename="site")
router.register("departments", DepartmentViewSet, basename="department")

app_name = "organizations"

urlpatterns = [
    path("", include(router.urls)),
]

"""Notifications URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

app_name = "notifications"

urlpatterns = [
    path("", include(router.urls)),
]

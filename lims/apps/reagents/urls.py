"""Reagent URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReagentViewSet, ReagentLotViewSet, InventoryTransactionViewSet

router = DefaultRouter()
router.register("lots", ReagentLotViewSet, basename="reagent-lot")
router.register("transactions", InventoryTransactionViewSet, basename="inventory-transaction")
router.register("", ReagentViewSet, basename="reagent")

app_name = "reagents"

urlpatterns = [
    path("", include(router.urls)),
]

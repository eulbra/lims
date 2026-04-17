"""Order views."""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer, OrderListSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """Manage test orders."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "urgency", "panel"]
    search_fields = ["order_number", "patient_id", "patient_name"]
    ordering_fields = ["created_at", "receipt_date"]

    def get_queryset(self):
        qs = Order.objects.all()
        if self.request.user.site_id:
            qs = qs.filter(site=self.request.user.site)
        return qs.select_related("panel")

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action == "list":
            return OrderListSerializer
        return OrderSerializer

    @action(detail=True, methods=["post"])
    def create_sample(self, request, pk=None):
        """Create a sample linked to this order."""
        order = self.get_object()
        order.status = "SAMPLED"
        order.save(update_fields=["status", "updated_at"])
        return Response({"message": f"Sample can now be linked to order {order.order_number}"})

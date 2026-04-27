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
    def submit(self, request, pk=None):
        """Submit order for processing."""
        order = self.get_object()
        if order.status != "CREATED":
            return Response({"error": "Only CREATED orders can be submitted"}, status=400)
        order.status = "IN_PROGRESS"
        order.save(update_fields=["status", "updated_at"])
        # Cascade: auto-accept associated sample if still RECEIVED
        if order.sample and order.sample.status == "RECEIVED":
            order.sample.status = "ACCEPTED"
            order.sample.save(update_fields=["status", "updated_at"])
        return Response({"status": order.status, "order_number": order.order_number})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark order as completed."""
        order = self.get_object()
        if order.status not in ["CREATED", "SAMPLED", "IN_PROGRESS"]:
            return Response({"error": "Order cannot be completed from current status"}, status=400)
        order.status = "COMPLETED"
        order.save(update_fields=["status", "updated_at"])
        return Response({"status": order.status, "order_number": order.order_number})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel an order."""
        order = self.get_object()
        if order.status in ["COMPLETED", "REPORTED", "CANCELLED"]:
            return Response({"error": "Order cannot be cancelled"}, status=400)
        order.status = "CANCELLED"
        order.save(update_fields=["status", "updated_at"])
        return Response({"status": order.status, "order_number": order.order_number})

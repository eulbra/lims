"""Notifications views."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.filters import OrderingFilter
from .models import Notification
from .serializers import NotificationSerializer, NotificationCreateSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """In-app notifications."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return NotificationCreateSerializer
        return NotificationSerializer

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])
        return Response({"is_read": True})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({"count": "all marked read"})

    @action(detail=False, methods=["get"])
    def unread(self, request):
        """Get only unread notifications."""
        unread = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(unread)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

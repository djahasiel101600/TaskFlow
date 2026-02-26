from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["model_name", "action", "user"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").order_by("-created_at")
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs[:500]

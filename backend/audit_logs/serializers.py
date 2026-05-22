from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "user", "username", "action", "model_name", "object_id", "changes", "created_at"]

    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

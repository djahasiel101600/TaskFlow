from rest_framework import serializers
from users.serializers import UserMinimalSerializer, RoleSerializer
from .models import Task, TaskComment, TaskLink


class TaskSerializer(serializers.ModelSerializer):
    created_by_detail = UserMinimalSerializer(source="created_by", read_only=True)
    assigned_to_detail = UserMinimalSerializer(source="assigned_to", read_only=True)
    assigned_to_role_detail = RoleSerializer(source="assigned_to_role", read_only=True)
    assignees_detail = UserMinimalSerializer(source="assignees", many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "created_by",
            "created_by_detail",
            "assigned_to",
            "assigned_to_detail",
            "assigned_to_role",
            "assigned_to_role_detail",
            "assignees",
            "assignees_detail",
            "priority",
            "status",
            "deadline",
            "reminder_datetime",
            "created_at",
            "updated_at",
            "is_overdue",
            "attachment_count",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]

    def get_attachment_count(self, obj):
        return getattr(obj, "_attachment_count", 0) or 0

    def create(self, validated_data):
        # Never pass M2M or FK assignees/assigned_to to create(); view sets them after.
        validated_data.pop("assignees", None)
        validated_data.pop("assigned_to", None)
        return super().create(validated_data)


class TaskLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLink
        fields = ["id", "task", "url", "label", "added_by", "created_at"]
        read_only_fields = ["task", "added_by", "created_at"]


class TaskCommentSerializer(serializers.ModelSerializer):
    author_detail = UserMinimalSerializer(source="author", read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "task", "author", "author_detail", "body", "created_at"]
        read_only_fields = ["task", "author", "created_at"]

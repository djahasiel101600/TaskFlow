from rest_framework import permissions
from tasks.permissions import user_has_perm, user_can_view_task


class AttachmentPermissions(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        # Can view attachment if you can view the task (creator or assignee)
        if request.method in ("GET", "HEAD"):
            return user_can_view_task(request.user, obj.task)
        if request.method == "DELETE":
            # Task creator can delete any attachment; uploader can delete own; or can_edit_tasks
            if obj.task.created_by_id == request.user.id:
                return True
            return obj.uploaded_by_id == request.user.id or user_has_perm(request.user, "can_edit_tasks")
        return False

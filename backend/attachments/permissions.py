from rest_framework import permissions
from tasks.permissions import user_has_perm


class AttachmentPermissions(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.method in ("GET", "HEAD"):
            return obj.uploaded_by_id == request.user.id or user_has_perm(request.user, "can_view_tasks")
        if request.method == "DELETE":
            return obj.uploaded_by_id == request.user.id or user_has_perm(request.user, "can_edit_tasks")
        return False

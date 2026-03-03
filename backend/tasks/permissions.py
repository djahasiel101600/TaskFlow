from rest_framework import permissions
from django.db.models import Q


def user_has_perm(user, perm_name):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = getattr(user, "role", None)
    if not role:
        return False
    return getattr(role, perm_name, False)


def user_can_see_all_tasks(user):
    """Only superuser sees all tasks. Everyone else sees only tasks they created or are assigned to."""
    return user.is_superuser


def user_can_view_task(user, task):
    """Task is visible to creator, assignee, or any assignee in assignees. Superuser can see any."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if task.created_by_id == user.id:
        return True
    if task.assigned_to_id == user.id:
        return True
    if task.assignees.filter(id=user.id).exists():
        return True
    return False


class TaskPermissions(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return user_has_perm(request.user, "can_view_tasks")
        if request.method == "POST":
            return user_has_perm(request.user, "can_create_tasks")
        if request.method in ("PUT", "PATCH"):
            return user_has_perm(request.user, "can_edit_tasks")
        if request.method == "DELETE":
            # Any authenticated user may attempt delete; object permission restricts to creator only
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if not user_can_view_task(request.user, obj):
            return False
        if request.method in ("GET", "HEAD"):
            return True
        # Creator can always edit and delete their own task
        if obj.created_by_id == request.user.id:
            if request.method in ("PUT", "PATCH", "DELETE"):
                return True
        if request.method in ("PUT", "PATCH"):
            return user_has_perm(request.user, "can_edit_tasks")
        # Delete: only creator (and superuser) can delete; shared tasks cannot be deleted by assignees
        if request.method == "DELETE":
            return False
        return False

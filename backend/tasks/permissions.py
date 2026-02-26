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
    """Staff or users with can_view_tasks can see all tasks; others only their own / assigned."""
    return user.is_staff or user.is_superuser or user_has_perm(user, "can_view_tasks")


def user_can_view_task(user, task):
    """Task is visible to creator, single assignee, any assignee in assignees, or staff."""
    if not user or not user.is_authenticated:
        return False
    if user_can_see_all_tasks(user):
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
            return user_has_perm(request.user, "can_delete_tasks")
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if not user_can_view_task(request.user, obj):
            return False
        if request.method in ("GET", "HEAD"):
            return True
        if request.method in ("PUT", "PATCH"):
            return user_has_perm(request.user, "can_edit_tasks")
        if request.method == "DELETE":
            return user_has_perm(request.user, "can_delete_tasks")
        return False

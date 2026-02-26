from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Task, TaskComment, TaskLink
from .serializers import TaskSerializer, TaskCommentSerializer, TaskLinkSerializer
from .permissions import TaskPermissions, user_can_see_all_tasks, user_can_view_task
from .filters import TaskFilter
from attachments.models import Attachment
from audit_logs.models import AuditLog
from notifications.models import Notification


def _task_queryset_base():
    return Task.objects.select_related("created_by", "assigned_to", "assigned_to_role").prefetch_related("assignees").annotate(
        _attachment_count=Count("attachments", distinct=True)
    )


def _visible_tasks(user):
    """Tasks visible to user: created by them, assigned_to them, or in assignees. Staff see all."""
    if user_can_see_all_tasks(user):
        return _task_queryset_base()
    return _task_queryset_base().filter(
        Q(created_by=user) | Q(assigned_to=user) | Q(assignees=user)
    ).distinct()


def _broadcast_task_list_invalidate(user_ids):
    """Notify users to refresh their task list (real-time create/assign/update)."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    payload = {"type": "task_list_invalidate"}
    for uid in set(user_ids):
        async_to_sync(channel_layer.group_send)(
            f"notifications_{uid}",
            {"type": "task_list_invalidate", "payload": payload},
        )


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [TaskPermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "deadline", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = _visible_tasks(self.request.user)
        my_tasks = self.request.query_params.get("my_tasks")
        if my_tasks and my_tasks.lower() == "true":
            qs = qs.filter(Q(assigned_to=self.request.user) | Q(assignees=self.request.user)).distinct()
        return qs

    def perform_create(self, serializer):
        assignees_ids = serializer.validated_data.pop("assignees", None)
        serializer.validated_data.pop("assigned_to", None)
        task = serializer.save(created_by=self.request.user)
        if assignees_ids is not None:
            task.assignees.set(assignees_ids)
            if assignees_ids:
                first_id = assignees_ids[0].id if hasattr(assignees_ids[0], "id") else assignees_ids[0]
                task.assigned_to_id = first_id
                task.assigned_to_role = None
                task.save(update_fields=["assigned_to", "assigned_to_role"])
        to_notify = set(task.assignees.values_list("id", flat=True))
        if task.assigned_to_id:
            to_notify.add(task.assigned_to_id)
        for uid in to_notify:
            if uid == self.request.user.id:
                continue
            Notification.objects.create(
                recipient_id=uid,
                notification_type=Notification.TYPE_TASK_ASSIGNED,
                title="Task Assigned",
                message=f'You were assigned to task "{task.title}"',
                link=f"/tasks/{task.id}",
                extra_data={"task_id": task.id},
            )
        _broadcast_task_list_invalidate([self.request.user.id] + list(to_notify))


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [TaskPermissions]

    def get_queryset(self):
        return _visible_tasks(self.request.user)

    def perform_update(self, serializer):
        old = serializer.instance
        old_assigned_to = old.assigned_to_id
        old_assignees = set(old.assignees.values_list("id", flat=True))
        old_status = old.status
        data = serializer.validated_data
        assignees_ids = data.pop("assignees", None)
        if "assigned_to" in data and data["assigned_to"] is not None:
            data["assigned_to_role"] = None
        if "assigned_to_role" in data and data["assigned_to_role"] is not None:
            data["assigned_to"] = None
        serializer.save()
        task = serializer.instance
        if assignees_ids is not None:
            task.assignees.set(assignees_ids)
            if assignees_ids:
                first = assignees_ids[0]
                task.assigned_to_id = first.id if hasattr(first, "id") else first
                task.assigned_to_role = None
            else:
                task.assigned_to = None
            task.save(update_fields=["assigned_to", "assigned_to_role"])
        user = self.request.user
        new_assignees = set(task.assignees.values_list("id", flat=True))
        added = new_assignees - old_assignees
        assigned_to_pk = getattr(task.assigned_to_id, "id", task.assigned_to_id)
        if added or (assigned_to_pk and assigned_to_pk != old_assigned_to):
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ACTION_ASSIGN,
                model_name="task",
                object_id=task.id,
                changes={"assignees": list(new_assignees), "previous": list(old_assignees)},
            )
            for uid in added:
                Notification.objects.create(
                    recipient_id=uid,
                    notification_type=Notification.TYPE_TASK_ASSIGNED,
                    title="Task Assigned",
                    message=f'You were assigned to task "{task.title}"',
                    link=f"/tasks/{task.id}",
                    extra_data={"task_id": task.id},
                )
            if assigned_to_pk and assigned_to_pk not in old_assignees and assigned_to_pk not in added:
                Notification.objects.create(
                    recipient_id=assigned_to_pk,
                    notification_type=Notification.TYPE_TASK_ASSIGNED,
                    title="Task Assigned",
                    message=f'You were assigned to task "{task.title}"',
                    link=f"/tasks/{task.id}",
                    extra_data={"task_id": task.id},
                )
        if old_status != task.status:
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ACTION_STATUS,
                model_name="task",
                object_id=task.id,
                changes={"status": task.status, "previous": old_status},
            )
        if (
            old.title != task.title
            or old.description != task.description
            or old.priority != task.priority
            or old.deadline != task.deadline
            or old.reminder_datetime != task.reminder_datetime
        ):
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ACTION_UPDATE,
                model_name="task",
                object_id=task.id,
                changes={"title": task.title},
            )
            for uid in new_assignees:
                if uid != user.id:
                    Notification.objects.create(
                        recipient_id=uid,
                        notification_type=Notification.TYPE_TASK_UPDATED,
                        title="Task Updated",
                        message=f'Task "{task.title}" was updated.',
                        link=f"/tasks/{task.id}",
                        extra_data={"task_id": task.id},
                    )
        if assigned_to_pk and assigned_to_pk != user.id and assigned_to_pk not in new_assignees:
            Notification.objects.create(
                recipient_id=assigned_to_pk,
                notification_type=Notification.TYPE_TASK_UPDATED,
                title="Task Updated",
                message=f'Task "{task.title}" was updated.',
                link=f"/tasks/{task.id}",
                extra_data={"task_id": task.id},
            )
        _broadcast_task_list_invalidate(
            [user.id] + list(new_assignees) + ([assigned_to_pk] if assigned_to_pk else [])
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.ACTION_DELETE,
            model_name="task",
            object_id=instance.id,
            changes={"title": instance.title},
        )
        instance.delete()


class TaskCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskCommentSerializer
    permission_classes = [TaskPermissions]

    def get_queryset(self):
        task_id = self.kwargs.get("task_id")
        qs = TaskComment.objects.filter(task_id=task_id).select_related("author").order_by("created_at")
        task = Task.objects.filter(pk=task_id).first()
        if task and not user_can_view_task(self.request.user, task):
            return TaskComment.objects.none()
        return qs

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_id")
        task = Task.objects.get(pk=task_id)
        if not user_can_view_task(self.request.user, task):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only comment on tasks you created or are assigned to.")
        comment = serializer.save(task=task, author=self.request.user)
        author_id = self.request.user.id
        to_notify = set()
        if task.created_by_id and task.created_by_id != author_id:
            to_notify.add(task.created_by_id)
        for uid in task.assignees.values_list("id", flat=True):
            if uid != author_id:
                to_notify.add(uid)
        if task.assigned_to_id and task.assigned_to_id != author_id:
            to_notify.add(task.assigned_to_id)
        author_name = self.request.user.username or self.request.user.email or "Someone"
        for uid in to_notify:
            Notification.objects.create(
                recipient_id=uid,
                notification_type=Notification.TYPE_TASK_COMMENT,
                title="New comment on task",
                message=f'{author_name} commented on task "{task.title}".',
                link=f"/tasks/{task.id}",
                extra_data={"task_id": task.id, "comment_id": comment.id},
            )
        channel_layer = get_channel_layer()
        if channel_layer:
            from .serializers import TaskCommentSerializer
            comment_data = TaskCommentSerializer(comment).data
            async_to_sync(channel_layer.group_send)(
                f"task_comments_{task_id}",
                {"type": "new_comment", "comment": comment_data},
            )


class TaskLinkListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskLinkSerializer
    permission_classes = [TaskPermissions]

    def get_queryset(self):
        task_id = self.kwargs.get("task_id")
        task = Task.objects.filter(pk=task_id).first()
        if not task or not user_can_view_task(self.request.user, task):
            return TaskLink.objects.none()
        return TaskLink.objects.filter(task_id=task_id).select_related("added_by").order_by("-created_at")

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_id")
        task = Task.objects.get(pk=task_id)
        if not user_can_view_task(self.request.user, task):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only add links to tasks you can view.")
        serializer.save(task=task, added_by=self.request.user)


class TaskLinkDetailView(generics.DestroyAPIView):
    permission_classes = [TaskPermissions]

    def get_queryset(self):
        return TaskLink.objects.select_related("task").filter(task__pk=self.kwargs.get("task_id"))

    def check_object_permissions(self, request, obj):
        if not user_can_view_task(request.user, obj.task):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete links from tasks you can view.")


class TaskStatusHistoryView(APIView):
    """Timeline of status changes for a task (from AuditLog)."""
    permission_classes = [TaskPermissions]

    def get(self, request, task_id):
        task = Task.objects.filter(pk=task_id).first()
        if not task or not user_can_view_task(request.user, task):
            from rest_framework.exceptions import NotFound
            raise NotFound()
        logs = (
            AuditLog.objects.filter(
                model_name="task",
                object_id=task_id,
                action__in=[AuditLog.ACTION_CREATE, AuditLog.ACTION_STATUS],
            )
            .select_related("user")
            .order_by("created_at")
        )
        result = []
        for log in logs:
            changes = log.changes or {}
            if log.action == AuditLog.ACTION_CREATE:
                from_status = None
                to_status = changes.get("status", "pending")
            else:
                from_status = changes.get("previous")
                to_status = changes.get("status")
            result.append({
                "id": log.id,
                "created_at": log.created_at.isoformat(),
                "changed_by": {
                    "id": log.user_id,
                    "username": log.user.username if log.user else None,
                } if log.user else None,
                "from_status": from_status,
                "to_status": to_status,
            })
        return Response(result)

"""
Shared logic for creating reminder and deadline notifications.
Used by the management command and by the Celery periodic task.

Flow: Celery Beat runs check_reminders_and_deadlines every minute. This creates
Notification rows for tasks whose reminder_datetime or deadline has passed. The
notifications app's post_save signal pushes each new notification over the
channel layer (Redis) to the user's WebSocket group. The frontend (Layout)
receives it on /ws/notifications/, adds it to the store, and plays a sound.
Requires CHANNEL_LAYERS to use Redis (not InMemoryChannelLayer) so the Celery
worker and Daphne share the same layer.
"""
from django.utils import timezone
from django.db.models import Q

from tasks.models import Task
from notifications.models import Notification


def process_reminders_and_deadlines(*, dry_run: bool = False) -> tuple[int, int]:
    """
    Create notifications for tasks whose reminder_datetime or deadline has been reached.
    Returns (reminders_created, deadlines_created).
    """
    now = timezone.now()
    active = Q(status="pending") | Q(status="ongoing")
    reminders_created = 0
    deadlines_created = 0

    # Reminders: reminder_datetime <= now
    reminder_tasks = Task.objects.filter(
        active,
        reminder_datetime__isnull=False,
        reminder_datetime__lte=now,
    ).select_related("assigned_to", "created_by")

    for task in reminder_tasks:
        if Notification.objects.filter(
            notification_type=Notification.TYPE_REMINDER,
            extra_data__task_id=task.id,
            created_at__gte=now - timezone.timedelta(hours=1),
        ).exists():
            continue
        recipient = task.assigned_to or task.created_by
        if not recipient:
            continue
        if dry_run:
            continue
        Notification.objects.create(
            recipient=recipient,
            notification_type=Notification.TYPE_REMINDER,
            title="Reminder",
            message=f'Task "{task.title}" reminder.',
            link=f"/tasks/{task.id}",
            extra_data={"task_id": task.id},
        )
        reminders_created += 1

    # Deadlines: deadline <= now
    deadline_tasks = Task.objects.filter(
        active,
        deadline__isnull=False,
        deadline__lte=now,
    ).select_related("assigned_to", "created_by")

    for task in deadline_tasks:
        if Notification.objects.filter(
            notification_type=Notification.TYPE_DEADLINE,
            extra_data__task_id=task.id,
            created_at__gte=now - timezone.timedelta(hours=24),
        ).exists():
            continue
        recipient = task.assigned_to or task.created_by
        if not recipient:
            continue
        if dry_run:
            continue
        Notification.objects.create(
            recipient=recipient,
            notification_type=Notification.TYPE_DEADLINE,
            title="Deadline Reached",
            message=f'Task "{task.title}" has reached its deadline.',
            link=f"/tasks/{task.id}",
            extra_data={"task_id": task.id},
        )
        deadlines_created += 1

    return reminders_created, deadlines_created

"""
Run periodically (e.g. every minute via cron) to create notifications for reminder_datetime and deadline.
Example cron: * * * * * cd /path/to/backend && python manage.py check_reminders_and_deadlines
"""
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.db.models import Q
from tasks.models import Task
from notifications.models import Notification


class Command(BaseCommand):
    help = "Create notifications for tasks with reminder_datetime or deadline reached."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only print what would be done.",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        dry_run = options["dry_run"]
        active = Q(status="pending") | Q(status="ongoing")

        # Reminders: reminder_datetime <= now, not yet notified (we use extra_data to avoid duplicate)
        reminder_tasks = Task.objects.filter(
            active, reminder_datetime__isnull=False, reminder_datetime__lte=now
        ).select_related("assigned_to", "created_by")
        for task in reminder_tasks:
            # Skip if we already sent a reminder for this task recently (same hour)
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
                self.stdout.write(f"Would create reminder notification for task {task.id} to {recipient.username}")
                continue
            Notification.objects.create(
                recipient=recipient,
                notification_type=Notification.TYPE_REMINDER,
                title="Reminder",
                message=f'Task "{task.title}" reminder.',
                link=f"/tasks/{task.id}",
                extra_data={"task_id": task.id},
            )
            self.stdout.write(self.style.SUCCESS(f"Reminder sent for task {task.id}"))

        # Deadlines: deadline <= now, status not finished/cancelled, not yet notified
        deadline_tasks = Task.objects.filter(
            active, deadline__isnull=False, deadline__lte=now
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
                self.stdout.write(f"Would create deadline notification for task {task.id} to {recipient.username}")
                continue
            Notification.objects.create(
                recipient=recipient,
                notification_type=Notification.TYPE_DEADLINE,
                title="Deadline Reached",
                message=f'Task "{task.title}" has reached its deadline.',
                link=f"/tasks/{task.id}",
                extra_data={"task_id": task.id},
            )
            self.stdout.write(self.style.SUCCESS(f"Deadline notification sent for task {task.id}"))

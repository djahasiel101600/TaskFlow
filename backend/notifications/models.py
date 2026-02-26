from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_TASK_ASSIGNED = "task_assigned"
    TYPE_TASK_UPDATED = "task_updated"
    TYPE_REMINDER = "reminder"
    TYPE_DEADLINE = "deadline"
    TYPE_CHAT_MESSAGE = "chat_message"
    TYPE_TASK_COMMENT = "task_comment"
    TYPE_CHOICES = [
        (TYPE_TASK_ASSIGNED, "Task Assigned"),
        (TYPE_TASK_UPDATED, "Task Updated"),
        (TYPE_REMINDER, "Reminder Triggered"),
        (TYPE_DEADLINE, "Deadline Reached"),
        (TYPE_CHAT_MESSAGE, "Chat Message Received"),
        (TYPE_TASK_COMMENT, "New Comment on Task"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    extra_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} to {self.recipient_id}"

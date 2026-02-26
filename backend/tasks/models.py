from django.db import models
from django.conf import settings
from django.utils import timezone


PRIORITY_CHOICES = [
    ("low", "Low"),
    ("medium", "Medium"),
    ("high", "High"),
    ("urgent", "Urgent"),
]

STATUS_CHOICES = [
    ("pending", "Pending"),
    ("ongoing", "Ongoing"),
    ("finished", "Finished"),
    ("cancelled", "Cancelled"),
]


class Task(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    assigned_to_role = models.ForeignKey(
        "users.Role",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="tasks_assigned_to",
        blank=True,
        help_text="Multiple people assigned to this task.",
    )
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    deadline = models.DateTimeField(null=True, blank=True)
    reminder_datetime = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def is_overdue(self):
        if not self.deadline or self.status in ("finished", "cancelled"):
            return False
        return timezone.now() > self.deadline


class TaskComment(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on task {self.task_id} by {self.author_id}"


class TaskLink(models.Model):
    """Hyperlink attached to a task (e.g. Paperless-ngx document or external source)."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="links"
    )
    url = models.URLField(max_length=2000)
    label = models.CharField(max_length=255, blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_links_added",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.label or self.url[:50]

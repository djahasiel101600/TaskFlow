from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    # Permissions as comma-separated or JSON; keeping simple with flags for now
    can_view_tasks = models.BooleanField(default=True)
    can_create_tasks = models.BooleanField(default=False)
    can_edit_tasks = models.BooleanField(default=False)
    can_delete_tasks = models.BooleanField(default=False)
    can_assign_tasks = models.BooleanField(default=False)
    can_change_task_status = models.BooleanField(default=False)
    can_access_chat = models.BooleanField(default=True)
    can_manage_users = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.ForeignKey(
        Role, on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )

    def __str__(self):
        return self.username

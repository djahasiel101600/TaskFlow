from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "assigned_to", "deadline", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]

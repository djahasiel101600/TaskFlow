from django_filters.rest_framework import FilterSet
from django_filters import NumberFilter
from .models import Task


class TaskFilter(FilterSet):
    """Explicit filters so assigned_to/created_by only accept numeric IDs (avoid User instance passed to id)."""
    assigned_to = NumberFilter(field_name="assigned_to_id")
    created_by = NumberFilter(field_name="created_by_id")

    class Meta:
        model = Task
        fields = ["status", "priority", "assigned_to", "created_by"]

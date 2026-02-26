from django.urls import path
from .views import (
    TaskListCreateView,
    TaskDetailView,
    TaskCommentListCreateView,
    TaskLinkListCreateView,
    TaskLinkDetailView,
    TaskStatusHistoryView,
)

urlpatterns = [
    path("tasks/", TaskListCreateView.as_view(), name="task_list"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail"),
    path("tasks/<int:task_id>/comments/", TaskCommentListCreateView.as_view(), name="task_comments"),
    path("tasks/<int:task_id>/links/", TaskLinkListCreateView.as_view(), name="task_links"),
    path("tasks/<int:task_id>/links/<int:pk>/", TaskLinkDetailView.as_view(), name="task_link_detail"),
    path("tasks/<int:task_id>/status_history/", TaskStatusHistoryView.as_view(), name="task_status_history"),
]

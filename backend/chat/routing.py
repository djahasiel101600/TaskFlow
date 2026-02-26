from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<channel_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r"ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
    re_path(r"ws/task-comments/(?P<task_id>\d+)/$", consumers.TaskCommentConsumer.as_asgi()),
]

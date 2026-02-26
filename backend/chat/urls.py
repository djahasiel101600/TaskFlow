from django.urls import path
from .views import ChannelListCreateView, ChannelDetailView, MessageListCreateView

urlpatterns = [
    path("channels/", ChannelListCreateView.as_view(), name="channel_list"),
    path("channels/<int:pk>/", ChannelDetailView.as_view(), name="channel_detail"),
    path("channels/<int:channel_id>/messages/", MessageListCreateView.as_view(), name="message_list"),
]

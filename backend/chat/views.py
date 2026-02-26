import os
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from .models import Channel, Message, MessageAttachment
from .serializers import ChannelSerializer, MessageSerializer
from notifications.models import Notification

MAX_FILE_SIZE = getattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE", 10 * 1024 * 1024)
ALLOWED_EXT = set().union(
    *getattr(settings, "ALLOWED_UPLOAD_EXTENSIONS", {}).values()
) or {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".jpg", ".jpeg", ".png", ".gif"}


class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Channel.objects.filter(members=self.request.user).prefetch_related(
            "members", "messages"
        ).distinct()

    def perform_create(self, serializer):
        ch = serializer.save()
        ch.members.add(self.request.user)
        member_ids = self.request.data.get("members") or []
        if member_ids:
            ch.members.add(*[int(x) for x in member_ids if str(x).isdigit()])


class ChannelDetailView(generics.RetrieveAPIView):
    queryset = Channel.objects.prefetch_related("members")
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Channel.objects.filter(members=self.request.user)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        channel_id = self.kwargs.get("channel_id")
        return Message.objects.filter(channel_id=channel_id).select_related("sender").prefetch_related("attachments").order_by("created_at")

    def perform_create(self, serializer):
        channel_id = self.kwargs.get("channel_id")
        channel = Channel.objects.filter(members=self.request.user).get(id=channel_id)
        message = serializer.save(channel=channel, sender=self.request.user)
        files = self.request.FILES.getlist("attachments") or self.request.FILES.getlist("files") or []
        for f in files:
            ext = os.path.splitext(f.name)[1].lower()
            if ext not in ALLOWED_EXT or f.size > MAX_FILE_SIZE:
                continue
            MessageAttachment.objects.create(
                message=message,
                file=f,
                filename=f.name,
                uploaded_by=self.request.user,
            )
        message.refresh_from_db()
        channel_layer = get_channel_layer()
        if channel_layer:
            payload = MessageSerializer(message).data
            async_to_sync(channel_layer.group_send)(
                f"chat_{channel_id}",
                {"type": "chat_message", "message": payload},
            )
        sender_name = (self.request.user.get_full_name() or self.request.user.username or "").strip() or "Someone"
        channel_name = channel.name or f"Channel {channel_id}"
        for member in channel.members.exclude(id=self.request.user.id):
            Notification.objects.create(
                recipient=member,
                notification_type=Notification.TYPE_CHAT_MESSAGE,
                title="New chat message",
                message=f'{sender_name} sent a message in "{channel_name}".',
                link=f"/chat?channel={channel_id}",
                extra_data={"channel_id": channel_id, "message_id": message.id},
            )

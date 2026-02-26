from django.db import models
from django.conf import settings


class Channel(models.Model):
    CHANNEL_DIRECT = "direct"
    CHANNEL_GROUP = "group"
    TYPE_CHOICES = [(CHANNEL_DIRECT, "Direct"), (CHANNEL_GROUP, "Group")]

    name = models.CharField(max_length=100, blank=True)
    channel_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=CHANNEL_DIRECT)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="chat_channels", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name or f"Channel {self.id}"


class Message(models.Model):
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sent_messages"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} in {self.channel_id}: {self.content[:50]}"


class MessageAttachment(models.Model):
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="chat_attachments/%Y/%m/%d/")
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

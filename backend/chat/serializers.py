from rest_framework import serializers
from users.serializers import UserMinimalSerializer
from .models import Channel, Message, MessageAttachment


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ["id", "file", "filename", "created_at"]
        read_only_fields = ["filename", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender_detail = UserMinimalSerializer(source="sender", read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ["id", "channel", "sender", "sender_detail", "content", "attachments", "created_at"]
        read_only_fields = ["channel", "sender", "created_at"]


class ChannelSerializer(serializers.ModelSerializer):
    members_detail = UserMinimalSerializer(source="members", many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ["id", "name", "channel_type", "members", "members_detail", "last_message", "created_at"]
        extra_kwargs = {"members": {"read_only": True}}

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last).data if last else None

from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification


def _push_notification(notification):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    payload = {
        "id": notification.id,
        "notification_type": notification.notification_type,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link,
        "read": notification.read,
        "created_at": str(notification.created_at),
        "extra_data": notification.extra_data or {},
    }
    async_to_sync(channel_layer.group_send)(
        f"notifications_{notification.recipient_id}",
        {"type": "send_notification", "payload": payload},
    )


@receiver(post_save, sender=Notification)
def on_notification_created(sender, instance, created, **kwargs):
    if created:
        _push_notification(instance)

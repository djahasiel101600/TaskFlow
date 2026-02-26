import json
from channels.generic.websocket import AsyncWebsocketConsumer


class TaskCommentConsumer(AsyncWebsocketConsumer):
    """Real-time comments for a task. Join task_comments_{task_id}; receive new_comment events."""

    async def connect(self):
        self.task_id = self.scope["url_route"]["kwargs"]["task_id"]
        self.room_group_name = f"task_comments_{self.task_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({"type": "new_comment", "comment": event["comment"]}))


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.room_group_name = f"chat_{self.channel_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message", "message": data},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        self.room_group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def task_list_invalidate(self, event):
        await self.send(text_data=json.dumps({"type": "task_list_invalidate", "payload": event.get("payload", {})}))

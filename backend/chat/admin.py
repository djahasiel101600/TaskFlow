from django.contrib import admin
from .models import Channel, Message


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    filter_horizontal = ["members"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["channel", "sender", "content", "created_at"]

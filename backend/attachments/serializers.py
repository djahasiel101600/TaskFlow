from rest_framework import serializers
from .models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "filename", "task", "uploaded_by", "created_at"]
        read_only_fields = ["uploaded_by", "filename", "created_at"]

import os
import mimetypes
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from .models import Attachment
from .serializers import AttachmentSerializer
from .permissions import AttachmentPermissions
from tasks.models import Task
from tasks.permissions import user_has_perm, user_can_view_task

MAX_FILE_SIZE = getattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE", 10 * 1024 * 1024)
ALLOWED_EXT = set().union(
    *getattr(settings, "ALLOWED_UPLOAD_EXTENSIONS", {}).values()
) or {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".jpg", ".jpeg", ".png", ".gif"}


class AttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        task_id = self.request.query_params.get("task_id")
        if task_id:
            task = Task.objects.filter(id=task_id).first()
            if not task or not user_has_perm(self.request.user, "can_view_tasks"):
                return Attachment.objects.none()
            return Attachment.objects.filter(task_id=task_id).order_by("-created_at")
        return Attachment.objects.filter(uploaded_by=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"file": ["No file provided."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXT:
            return Response(
                {"file": [f"File type {ext} not allowed."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > MAX_FILE_SIZE:
            return Response(
                {"file": ["File too large."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(uploaded_by=request.user, filename=file.name)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentDetailView(generics.RetrieveDestroyAPIView):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated, AttachmentPermissions]
    lookup_url_kwarg = "pk"


class AttachmentFileView(APIView):
    """Serve attachment file for preview/download with auth. Returns inline so browser can display PDF/images."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        att = get_object_or_404(Attachment.objects.select_related("task"), pk=pk)
        if att.task_id and not user_can_view_task(request.user, att.task):
            raise Http404()
        if not att.file:
            raise Http404()
        response = FileResponse(att.file.open("rb"), as_attachment=False)
        content_type, _ = mimetypes.guess_type(att.filename)
        response["Content-Type"] = content_type or "application/octet-stream"
        response["Content-Disposition"] = f'inline; filename="{att.filename}"'
        return response

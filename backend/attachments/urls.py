from django.urls import path
from .views import AttachmentListCreateView, AttachmentDetailView, AttachmentFileView

urlpatterns = [
    path("attachments/", AttachmentListCreateView.as_view(), name="attachment_list"),
    path("attachments/<int:pk>/", AttachmentDetailView.as_view(), name="attachment_detail"),
    path("attachments/<int:pk>/file/", AttachmentFileView.as_view(), name="attachment_file"),
]

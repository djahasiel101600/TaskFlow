from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/", include("tasks.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("chat.urls")),
    path("api/", include("attachments.urls")),
    path("api/", include("audit_logs.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

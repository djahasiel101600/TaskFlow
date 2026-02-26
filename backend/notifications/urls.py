from django.urls import path
from .views import NotificationListView, NotificationMarkReadView, NotificationMarkAllReadView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification_list"),
    path(
        "notifications/<int:pk>/read/",
        NotificationMarkReadView.as_view(),
        name="notification_mark_read",
    ),
    path("notifications/mark_all_read/", NotificationMarkAllReadView.as_view(), name="notification_mark_all_read"),
]

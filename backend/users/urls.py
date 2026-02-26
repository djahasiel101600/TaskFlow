from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    ThrottledTokenRefreshView,
    UserListCreateView,
    UserDetailView,
    RoleListView,
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("users/", UserListCreateView.as_view(), name="user_list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user_detail"),
    path("roles/", RoleListView.as_view(), name="role_list"),
]

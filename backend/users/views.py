from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role
from .serializers import UserSerializer, UserMinimalSerializer, UserCreateSerializer, RoleSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login = attrs.get("username", "").strip()
        if "@" in login:
            from .models import User
            user = User.objects.filter(email__iexact=login).first()
            if user:
                attrs = {**attrs, "username": user.username}
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


@method_decorator(csrf_exempt, name="dispatch")
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle]


@method_decorator(csrf_exempt, name="dispatch")
class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [UserRateThrottle]


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("role").order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        # POST (create user) only for superusers (IsAdminUser allows staff; we want superuser only)
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can create users.")
        serializer.save()

    def get_serializer_class(self):
        if self.request.method == "GET" and not self.request.user.is_staff:
            return UserMinimalSerializer
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("role")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class RoleListView(generics.ListAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

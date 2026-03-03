from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import ValidationError
from .models import User, Role
from .serializers import (
    UserSerializer,
    UserMinimalSerializer,
    UserCreateSerializer,
    RoleSerializer,
    RegisterSerializer,
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login = attrs.get("username", "").strip()
        if "@" in login:
            user_by_email = User.objects.filter(email__iexact=login).first()
            if user_by_email:
                if not user_by_email.is_active:
                    raise ValidationError(
                        {"detail": "Account pending approval. Please wait for an administrator to activate your account."}
                    )
                attrs = {**attrs, "username": user_by_email.username}
        else:
            user_by_username = User.objects.filter(username__iexact=login).first()
            if user_by_username and not user_by_username.is_active:
                raise ValidationError(
                    {"detail": "Account pending approval. Please wait for an administrator to activate your account."}
                )
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


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    """Public self-registration. Creates user with is_active=False; admin must approve."""
    permission_classes = []
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        if not getattr(settings, "REGISTRATION_OPEN", True):
            return Response(
                {"detail": "Registration is currently closed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Registration successful. Your account is pending approval. You will be able to sign in once an administrator activates your account."},
            status=status.HTTP_201_CREATED,
        )


class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _user_can_see_full_list(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            return True
        role = getattr(u, "role", None)
        return role and getattr(role, "can_manage_users", False)

    def get_queryset(self):
        qs = User.objects.select_related("role").order_by("-date_joined")
        if self._user_can_see_full_list():
            is_active = self.request.query_params.get("is_active")
            if is_active is not None:
                if is_active.lower() in ("true", "1"):
                    qs = qs.filter(is_active=True)
                elif is_active.lower() in ("false", "0"):
                    qs = qs.filter(is_active=False)
        return qs

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        # POST (create user) only for superusers
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can create users.")
        serializer.save()

    def get_serializer_class(self):
        if self.request.method == "GET" and not self._user_can_see_full_list():
            return UserMinimalSerializer
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class CanManageUsersOrAdmin(permissions.BasePermission):
    """Allow PATCH/DELETE for staff, superuser, or users with can_manage_users role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD"):
            return True
        if request.user.is_staff or request.user.is_superuser:
            return True
        role = getattr(request.user, "role", None)
        return bool(role and getattr(role, "can_manage_users", False))


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("role")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsersOrAdmin]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), CanManageUsersOrAdmin()]


class RoleListView(generics.ListAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

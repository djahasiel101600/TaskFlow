from urllib.parse import parse_qs
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        auth = JWTAuthentication()
        validated = auth.get_validated_token(token_str)
        return auth.get_user(validated)
    except (InvalidToken, AuthenticationFailed):
        return None


class JWTQueryAuthMiddleware:
    """Populate scope['user'] from JWT in query string (?token=...) for WebSocket."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket":
            qs = scope.get("query_string", b"").decode()
            params = parse_qs(qs)
            token_list = params.get("token") or params.get("access")
            if token_list:
                token = token_list[0].strip()
                if token:
                    user = await get_user_from_token(token)
                    scope["user"] = user if user else AnonymousUser()
                # else: leave scope["user"] as set by AuthMiddlewareStack
            # When no token param, scope["user"] stays from AuthMiddlewareStack (e.g. AnonymousUser)
        return await self.inner(scope, receive, send)


def JWTAndSessionAuthMiddlewareStack(inner):
    # Session first, then JWT overrides when token is present (SPA has no session)
    return AuthMiddlewareStack(JWTQueryAuthMiddleware(inner))

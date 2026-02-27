import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_asgi_app = get_asgi_application()

from chat.routing import websocket_urlpatterns
from config.middleware import JWTAndSessionAuthMiddlewareStack

# WebSocket: AllowedHostsOriginValidator checks Origin header against ALLOWED_HOSTS.
# Frontend at http://localhost:5173 → origin host "localhost" must be in ALLOWED_HOSTS.
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAndSessionAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
    ),
})

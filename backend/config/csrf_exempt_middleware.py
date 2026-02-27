"""
Mark JWT token endpoints as CSRF-exempt so SPA can POST without a CSRF token.
Runs before CsrfViewMiddleware; for these paths we set csrf_processing_done so CSRF is skipped.
"""
from django.utils.deprecation import MiddlewareMixin


class JWTAuthCSRFExemptMiddleware(MiddlewareMixin):
    """Skip CSRF for /api/auth/login/ and /api/auth/refresh/ (JWT token endpoints)."""

    def process_request(self, request):
        path = (request.path or "").rstrip("/")
        if path.endswith("/api/auth/login") or path.endswith("/api/auth/refresh"):
            request.csrf_processing_done = True

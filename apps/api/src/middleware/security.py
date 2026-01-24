"""Security headers and CORS middleware."""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from apps.api.src.core.config import get_settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to responses.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        settings = get_settings()

        # HSTS (HTTP Strict Transport Security)
        # 1 year = 31536000 seconds
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-Frame-Options (Prevent Clickjacking)
        response.headers["X-Frame-Options"] = "DENY"

        # X-XSS-Protection (Legacy but still useful for some browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content-Security-Policy (CSP)
        # Allow scripts, styles, etc. from self.
        # This is a baseline CSP; might need adjustment for external assets (CDNs, analytics)
        if settings.ENVIRONMENT == "production":
            csp_policy = (
                "default-src 'self'; "
                "img-src 'self' data: https:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # unsafe-inline/eval often needed for Next.js/React dev, refine for prod
                "style-src 'self' 'unsafe-inline'; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self';"
            )
            response.headers["Content-Security-Policy"] = csp_policy

        return response

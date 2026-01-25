"""Audit logging middleware for administrative actions."""



import structlog
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.core.database import async_session_factory
from src.services.audit_service import AuditService

logger = structlog.get_logger()


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware for intercepting state-changing requests and logging them to the audit trail."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process the request and log administrative actions."""
        # Skip read-only methods
        if request.method in ["GET", "OPTIONS", "HEAD"]:
            return await call_next(request)

        # Capture response
        response = await call_next(request)

        # Only log successful state changes
        if 200 <= response.status_code < 300:
            try:
                # Extract user ID if authenticated
                user_id = None
                if hasattr(request.state, "user"):
                    # request.state.user is usually a dict payload from JWT
                    user_payload = request.state.user
                    if user_payload and "sub" in user_payload:
                        user_id = user_payload["sub"]

                # Extract IP and User Agent
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")

                # Action and Resource
                path_parts = request.url.path.strip("/").split("/")
                resource_type = "unknown"
                resource_id = None

                # Simple heuristic for resource parsing: /api/v1/{resource}/{id}
                if len(path_parts) >= 3 and path_parts[0] == "api" and path_parts[1] == "v1":
                    resource_type = path_parts[2]
                    if len(path_parts) > 3:
                        resource_id = path_parts[3]

                action = request.method

                # Create Audit Log immediately to ensure persistence.
                async with async_session_factory() as session:
                    service = AuditService(session)
                    await service.create_log(
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )

            except (ValueError, SQLAlchemyError, Exception) as exc:  # pylint: disable=broad-exception-caught
                # Do not fail the request if audit logging fails, but log the error
                logger.error("audit_log_creation_failed", error=str(exc))

        return response

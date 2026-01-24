import contextlib
from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from apps.api.src.core.database import async_session_factory
from apps.api.src.services.audit_service import AuditService


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip read-only methods
        if request.method in ["GET", "OPTIONS", "HEAD"]:
            return await call_next(request)

        # Capture request body if possible?
        # For now, we won't consume the body to avoid interfering with the application
        # unless we robustly handle stream replacement.
        # We will log the action and resource.

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
                        with contextlib.suppress(ValueError):
                            user_id = UUID(user_payload["sub"])

                # Extract IP and User Agent
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")

                # Action and Resource
                # We can use the path as the resource indicator
                # e.g. /api/v1/groups/123 -> Resource Type: groups, Resource ID: 123
                path_parts = request.url.path.strip("/").split("/")
                resource_type = "unknown"
                resource_id = None

                # Simple heuristic for resource parsing: /api/v1/{resource}/{id}
                if len(path_parts) >= 3 and path_parts[0] == "api" and path_parts[1] == "v1":
                    resource_type = path_parts[2]
                    if len(path_parts) > 3:
                        resource_id = path_parts[3]

                action = request.method

                # Create Audit Log in background task or immediately?
                # Immediately to ensure persistence.
                async with async_session_factory() as session:
                    service = AuditService(session)
                    await service.create_log(
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        # new_value could be populated if we parsed the body
                        # old_value is hard to determine here
                    )

            except Exception:
                # Do not fail the request if audit logging fails, but log the error
                # Ideally use the apps logger
                pass

        return response

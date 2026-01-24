from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from apps.api.src.core.context import set_trace_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to generate request IDs and set them in the context.
    Also adds the ID to the response headers.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check for existing header (e.g. from load balancer)
        request_id = request.headers.get("X-Request-ID") or str(uuid4())

        # Set in context for logging and error handling
        set_trace_id(request_id)

        # Set in request state for convenient access
        request.state.request_id = request_id

        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-ID"] = request_id

        return response

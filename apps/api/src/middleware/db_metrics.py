"""Database metrics middleware for query tracking and N+1 detection."""

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from src.core.context import get_trace_id

logger = structlog.get_logger(__name__)


class DatabaseMetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track database query counts and detect N+1 query problems.

    Adds query_count and query_time to request.state for tracking.
    Logs warnings when query count exceeds threshold (potential N+1).
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Initialize query tracking on request state
        request.state.query_count = 0
        request.state.query_time = 0.0

        # Process the request
        response = await call_next(request)

        # Check for N+1 query problems (more than 10 queries per request)
        query_count = getattr(request.state, "query_count", 0)
        if query_count > 10:
            logger.warning(
                "n_plus_one_detected",
                extra={
                    "path": request.url.path,
                    "query_count": query_count,
                    "trace_id": get_trace_id(),
                },
            )

        # Add query count to response headers for debugging
        response.headers["X-DB-Query-Count"] = str(query_count)

        return response

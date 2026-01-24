import time
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from apps.api.src.core.context import get_trace_id

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log requests and responses (access logs).
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        trace_id = get_trace_id()

        # Log Request Start (Debug only)
        # We don't want to flood logs in production with "started", only "completed"
        # unless something goes wrong.

        try:
            response = await call_next(request)
            process_time = time.perf_counter() - start_time

            # Log successful request (or handled error)
            logger.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=round(process_time * 1000, 2),
                ip=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                trace_id=trace_id,
            )

            return response

        except Exception as e:
            process_time = time.perf_counter() - start_time

            # Log failed request (unhandled exception)
            # The global exception handler usually catches this, but if it fails...
            logger.error(
                "request_failed",
                method=request.method,
                path=request.url.path,
                error=str(e),
                duration_ms=round(process_time * 1000, 2),
                trace_id=trace_id,
            )
            raise e

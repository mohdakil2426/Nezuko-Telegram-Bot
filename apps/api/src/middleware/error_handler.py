"""Global error handling and RFC 9457 formatting."""

from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.core.context import get_trace_id
from src.core.exceptions import AppException

logger = structlog.get_logger()


def _get_status_title(status_code: int) -> str:
    """Get human-readable title for HTTP status code"""
    titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        409: "Conflict",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
    }
    return titles.get(status_code, "Error")


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers"""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        """Handle custom application exceptions"""
        trace_id = get_trace_id()

        # Log the error
        logger.warning(
            "application_error",
            code=exc.code,
            title=exc.title,
            detail=exc.detail,
            status_code=exc.status_code,
            path=request.url.path,
            method=request.method,
            trace_id=trace_id,
        )

        response_body: dict[str, Any] = {
            "type": f"https://api.nezuko.bot/errors/{exc.code.lower().replace('_', '-')}",
            "title": exc.title,
            "status": exc.status_code,
            "detail": exc.detail,
            "instance": request.url.path,
            "code": exc.code,
            "timestamp": datetime.now(UTC).isoformat(),
            "trace_id": trace_id,
        }

        if exc.errors:
            response_body["errors"] = exc.errors

        return JSONResponse(
            status_code=exc.status_code,
            content=response_body,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Handle Pydantic validation errors"""
        trace_id = get_trace_id()

        # Transform Pydantic errors to our format
        errors = []
        for error in exc.errors():
            # Handle potential missing 'loc' or other Pydantic v2 differences if necessary
            # Pydantic v2 usually has loc present.
            loc = error.get("loc", ())
            field = (
                ".".join(str(val) for val in loc[1:])
                if len(loc) > 1
                else str(loc[0])
                if loc
                else "unknown"
            )

            errors.append(
                {
                    "field": field,
                    "message": error.get("msg", "Invalid value"),
                    "type": error.get("type", "value_error"),
                },
            )

        logger.warning(
            "validation_error",
            errors=errors,
            path=request.url.path,
            method=request.method,
            trace_id=trace_id,
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "type": "https://api.nezuko.bot/errors/validation/invalid-input",
                "title": "Validation Failed",
                "status": 422,
                "detail": "Request body contains invalid or missing fields.",
                "instance": request.url.path,
                "code": "VAL_001",
                "timestamp": datetime.now(UTC).isoformat(),
                "trace_id": trace_id,
                "errors": errors,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle standard HTTP exceptions"""
        trace_id = get_trace_id()

        logger.warning(
            "http_error",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
            method=request.method,
            trace_id=trace_id,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "type": f"https://api.nezuko.bot/errors/http/{exc.status_code}",
                "title": _get_status_title(exc.status_code),
                "status": exc.status_code,
                "detail": str(exc.detail),
                "instance": request.url.path,
                "code": f"HTTP_{exc.status_code}",
                "timestamp": datetime.now(UTC).isoformat(),
                "trace_id": trace_id,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all unhandled exceptions (500 errors)"""
        trace_id = get_trace_id()

        # Log the full exception with stack trace
        logger.exception(
            "unhandled_exception",
            exception_type=type(exc).__name__,
            exception_message=str(exc),
            path=request.url.path,
            method=request.method,
            trace_id=trace_id,
        )

        # NEVER expose internal error details to client
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "type": "https://api.nezuko.bot/errors/server/internal-error",
                "title": "Internal Server Error",
                "status": 500,
                "detail": "An unexpected error occurred. Please try again later.",
                "instance": request.url.path,
                "code": "SRV_001",
                "timestamp": datetime.now(UTC).isoformat(),
                "trace_id": trace_id,  # Include trace_id for support tickets
            },
        )

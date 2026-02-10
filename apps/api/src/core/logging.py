"""Structured logging configuration for the API.

Uses structlog for structured, context-rich logging with multiple outputs:
- Console (pretty for dev, JSON for production)
- File (project root: storage/logs/api.log)
- Postgres (admin_logs table, production only)
- Redis (pub/sub for real-time streaming, production only)

Features:
- Automatic timestamp, log level, logger name
- Context fields (user_id, request_id, endpoint)
- JSON format for production (Loki/ELK-friendly)
- Pretty console output for development
- Pre-defined log functions for common events
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

import structlog
from structlog.types import EventDict, WrappedLogger

from .config import get_settings


def add_environment(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """Add environment to all log entries."""
    settings = get_settings()
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def add_app_info(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """Add application info to all log entries."""
    event_dict["app"] = "nezuko-api"
    event_dict["version"] = "1.0.0"
    return event_dict


def extract_context(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """
    Extract and normalize context fields.
    Ensures user_id, request_id, endpoint are properly formatted.
    """
    # Normalize IDs to strings for consistent JSON serialization
    for key in ["user_id", "request_id", "admin_id"]:
        if key in event_dict and event_dict[key] is not None:
            event_dict[key] = str(event_dict[key])
    return event_dict


def configure_logging(
    environment: str = "development",
    log_level: str = "INFO",
    log_to_file: bool = True,
    log_to_postgres: bool = True,
    log_to_redis: bool = True,
) -> None:
    """
    Configure structlog for production JSON logging with multiple outputs.

    Args:
        environment: 'production' or 'development'
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_to_file: Enable file logging to storage/logs/api.log
        log_to_postgres: Enable async Postgres logging (production only)
        log_to_redis: Enable Redis pub/sub logging (production only)
    """
    is_production = environment == "production"

    # Shared processors for all environments
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        add_environment,
        add_app_info,
        extract_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # Build handlers list
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if is_production:
        # Production: JSON output for log aggregation
        processors = [
            *shared_processors,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]
        log_format = "%(message)s"
        level = getattr(logging, log_level.upper())
    else:
        # Development: Pretty console output
        processors = [
            *shared_processors,
            structlog.dev.ConsoleRenderer(colors=True),
        ]
        log_format = "%(message)s"
        level = logging.DEBUG

    # File handler - log to storage/logs/api.log (project root, not relative to cwd)
    if log_to_file:
        # Get project root (3 levels up from this file: core -> src -> api -> apps -> root)
        project_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        log_dir = project_root / "storage" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "api.log"
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=50_000_000,  # 50MB
            backupCount=10,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        handlers.append(file_handler)

    # Postgres handler (production only, non-SQLite)
    if log_to_postgres and is_production:
        try:
            from .postgres_logging import PostgresLogHandler

            postgres_handler = PostgresLogHandler(source="api")
            postgres_handler.setLevel(logging.INFO)  # Only INFO+ to database
            handlers.append(postgres_handler)
        except Exception:  # pylint: disable=broad-exception-caught
            pass  # Silently skip if handler fails to initialize

    # Redis handler (production only)
    if log_to_redis and is_production:
        try:
            from .redis_logging import RedisLogHandler

            redis_handler = RedisLogHandler(channel="nezuko:api:logs", source="api")
            redis_handler.setLevel(logging.INFO)
            handlers.append(redis_handler)
        except Exception:  # pylint: disable=broad-exception-caught
            pass

    # Configure stdlib logging
    logging.basicConfig(
        format=log_format,
        level=level,
        handlers=handlers,
        force=True,  # Override any existing config
    )

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """
    Get a structlog logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Bound logger instance
    """
    if name:
        return structlog.get_logger(name)
    return structlog.get_logger()


def bind_context(**kwargs: Any) -> structlog.stdlib.BoundLogger:
    """
    Create a new logger with bound context fields.

    Usage:
        log = bind_context(user_id=123, request_id="abc-123")
        log.info("Processing request", endpoint="/api/v1/charts")

    Args:
        **kwargs: Context fields to bind

    Returns:
        New logger with context bound
    """
    return structlog.get_logger().bind(**kwargs)


class LogContext:
    """
    Context manager for temporary log context binding.

    Usage:
        with LogContext(user_id=123, request_id="abc-123"):
            log.info("Processing request")
            # All logs within this block have user_id and request_id
    """

    def __init__(self, **kwargs: Any) -> None:
        self.context = kwargs
        self._token: Any = None

    def __enter__(self) -> "LogContext":
        self._token = structlog.contextvars.bind_contextvars(**self.context)
        return self

    def __exit__(self, *args: Any) -> None:
        structlog.contextvars.unbind_contextvars(*self.context.keys())


# ====================
# Pre-configured Log Functions for Common API Events
# ====================


def log_request_start(
    method: str,
    path: str,
    user_id: int | str | None = None,
    request_id: str | None = None,
) -> None:
    """Log incoming HTTP request."""
    log = get_logger("request")
    log.info(
        f"{method} {path}",
        event_type="request_start",
        method=method,
        path=path,
        user_id=user_id,
        request_id=request_id,
    )


def log_request_complete(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    user_id: int | str | None = None,
    request_id: str | None = None,
) -> None:
    """Log completed HTTP request."""
    log = get_logger("request")
    log_method = log.info if status_code < 400 else log.warning
    log_method(
        f"{method} {path} -> {status_code}",
        event_type="request_complete",
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=round(duration_ms, 2),
        user_id=user_id,
        request_id=request_id,
    )


def log_auth_success(user_id: int | str, email: str | None = None) -> None:
    """Log successful authentication."""
    log = get_logger("auth")
    log.info(
        "Authentication successful",
        event_type="auth_success",
        user_id=user_id,
        email=email,
    )


def log_auth_failure(reason: str, email: str | None = None, ip: str | None = None) -> None:
    """Log failed authentication attempt."""
    log = get_logger("auth")
    log.warning(
        f"Authentication failed: {reason}",
        event_type="auth_failure",
        reason=reason,
        email=email,
        ip=ip,
    )


def log_database_query(
    operation: str,
    table: str,
    duration_ms: float | None = None,
    rows_affected: int | None = None,
) -> None:
    """Log database operation."""
    log = get_logger("database")
    extra: dict[str, Any] = {"operation": operation, "table": table}
    if duration_ms is not None:
        extra["duration_ms"] = round(duration_ms, 2)
    if rows_affected is not None:
        extra["rows_affected"] = rows_affected

    log.debug(f"DB {operation} on {table}", event_type="database_query", **extra)


def log_cache_event(
    operation: str,
    key: str,
    hit: bool | None = None,
    ttl: int | None = None,
) -> None:
    """Log cache operation."""
    log = get_logger("cache")
    extra: dict[str, Any] = {"operation": operation, "key": key}
    if hit is not None:
        extra["hit"] = hit
    if ttl is not None:
        extra["ttl"] = ttl

    log.debug(f"Cache {operation}", event_type="cache_operation", **extra)


def log_error(message: str, error: Exception, **context: Any) -> None:
    """
    Log an error with full context.

    Args:
        message: Error description
        error: Exception that occurred
        **context: Additional context (user_id, request_id, etc.)
    """
    log = get_logger("error")
    log.error(
        message,
        event_type="error",
        error_type=type(error).__name__,
        error_message=str(error),
        **context,
    )


def log_startup(database: str, redis: bool, environment: str) -> None:
    """Log API startup."""
    log = get_logger("startup")
    log.info(
        "API starting",
        event_type="startup",
        database=database.split("://")[0] if "://" in database else database,
        redis_enabled=redis,
        environment=environment,
    )


def log_shutdown() -> None:
    """Log API shutdown."""
    log = get_logger("shutdown")
    log.info("API shutting down", event_type="shutdown")

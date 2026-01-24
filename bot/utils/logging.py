"""
Structured logging configuration for GMBot v2.0.

Uses structlog for structured, context-rich logging with JSON output
for production and pretty-printed output for development.

Features:
- Automatic timestamp, log level, logger name
- Context fields (user_id, group_id, channel_id)
- JSON format for production (Loki/ELK-friendly)
- Pretty console output for development
- Integration with standard logging
"""

import logging
import sys
from typing import Optional
import structlog
from structlog.types import EventDict, WrappedLogger

from bot.config import config


def add_environment(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """Add environment to all log entries."""
    event_dict["environment"] = config.environment
    return event_dict


def add_app_info(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """Add application info to all log entries."""
    event_dict["app"] = "gmbot"
    event_dict["version"] = "2.0.0"
    return event_dict


def extract_context(_logger: WrappedLogger, _method_name: str, event_dict: EventDict) -> EventDict:
    """
    Extract and normalize context fields.
    Ensures user_id, group_id, channel_id are properly formatted.
    """
    # Normalize IDs to strings for consistent JSON serialization
    for key in ["user_id", "group_id", "channel_id"]:
        if key in event_dict and event_dict[key] is not None:
            event_dict[key] = str(event_dict[key])
    return event_dict


def configure_logging(json_format: bool = None) -> None:
    """
    Configure structlog and stdlib logging integration.

    Args:
        json_format: If True, use JSON format. If None, auto-detect from environment.
    """
    # Auto-detect format from environment if not specified
    if json_format is None:
        json_format = config.is_production

    # Configure shared processors
    shared_processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        add_environment,
        add_app_info,
        extract_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if json_format:
        # Production: JSON format for log aggregation (Loki, ELK, etc.)
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ]

        # Configure stdlib logging for JSON as well
        logging.basicConfig(
            format="%(message)s",
            level=logging.INFO,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler("bot.log")
            ]
        )
    else:
        # Development: Pretty console output
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]

        # Configure stdlib logging with readable format
        logging.basicConfig(
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            level=logging.DEBUG,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler("bot.log")
            ]
        )

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True
    )


def get_logger(name: Optional[str] = None) -> structlog.stdlib.BoundLogger:
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


def bind_context(**kwargs) -> structlog.stdlib.BoundLogger:
    """
    Create a new logger with bound context fields.

    Usage:
        log = bind_context(user_id=123, group_id=-100456)
        log.info("User verified", channel_id=-789)

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
        with LogContext(user_id=123, group_id=-456):
            log.info("Processing user")
            # All logs within this block have user_id and group_id
    """

    def __init__(self, **kwargs):
        self.context = kwargs
        self._token = None

    def __enter__(self):
        self._token = structlog.contextvars.bind_contextvars(**self.context)
        return self

    def __exit__(self, *args):
        structlog.contextvars.unbind_contextvars(*self.context.keys())


# ====================
# Pre-configured Loggers for Key Events
# ====================

def log_protection_activated(group_id: int, channel_id: int, owner_id: int):
    """Log when protection is activated for a group."""
    log = get_logger("protection")
    log.info(
        "Protection activated",
        event="protection_activated",
        group_id=group_id,
        channel_id=channel_id,
        owner_id=owner_id
    )


def log_user_verified(user_id: int, group_id: int, channel_id: int, cached: bool = False):
    """Log successful user verification."""
    log = get_logger("verification")
    log.info(
        "User verified",
        event="user_verified",
        user_id=user_id,
        group_id=group_id,
        channel_id=channel_id,
        cache_hit=cached
    )


def log_user_restricted(user_id: int, group_id: int, reason: str = "not_member"):
    """Log when a user is restricted/muted."""
    log = get_logger("protection")
    log.info(
        "User restricted",
        event="user_restricted",
        user_id=user_id,
        group_id=group_id,
        reason=reason
    )


def log_user_unrestricted(user_id: int, group_id: int):
    """Log when a user is unrestricted/unmuted."""
    log = get_logger("protection")
    log.info(
        "User unrestricted",
        event="user_unrestricted",
        user_id=user_id,
        group_id=group_id
    )


def log_api_call(method: str, params: dict = None, duration_ms: float = None):
    """Log Telegram API call."""
    log = get_logger("telegram")
    log.debug(
        f"API call: {method}",
        event="api_call",
        method=method,
        params=params or {},
        duration_ms=duration_ms
    )


def log_cache_event(operation: str, key: str, hit: bool = None, ttl: int = None):
    """Log cache operation."""
    log = get_logger("cache")
    extra = {"operation": operation, "key": key}
    if hit is not None:
        extra["hit"] = hit
    if ttl is not None:
        extra["ttl"] = ttl

    log.debug(f"Cache {operation}", event="cache_operation", **extra)


def log_error(message: str, error: Exception, **context):
    """
    Log an error with full context.

    Args:
        message: Error description
        error: Exception that occurred
        **context: Additional context (user_id, group_id, etc.)
    """
    log = get_logger("error")
    log.error(
        message,
        event="error",
        error_type=type(error).__name__,
        error_message=str(error),
        **context
    )


def log_startup(mode: str, database: str, redis: bool):
    """Log bot startup."""
    log = get_logger("startup")
    log.info(
        "Bot starting",
        event="startup",
        mode=mode,
        database=database.split("://")[0] if "://" in database else database,
        redis_enabled=redis
    )


def log_shutdown():
    """Log bot shutdown."""
    log = get_logger("shutdown")
    log.info("Bot shutting down", event="shutdown")


# Initialize logging on import (development mode by default)
# This will be re-configured when the bot starts
configure_logging()

"""Structured logging configuration for the API."""

import logging
import sys
from typing import Any

import structlog


def configure_logging(
    environment: str = "development",
    log_level: str = "INFO",
) -> None:
    """
    Configure structlog for production JSON logging
    """

    # Shared processors for all environments
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,  # Merge context variables
        structlog.stdlib.add_log_level,  # Add log level
        structlog.stdlib.add_logger_name,  # Add logger name
        structlog.processors.TimeStamper(fmt="iso", utc=True),  # ISO timestamp
        structlog.processors.StackInfoRenderer(),  # Stack info for exceptions
        structlog.processors.UnicodeDecoder(),  # Handle unicode
    ]

    if environment == "production":
        # Production: JSON output for log aggregation
        processors = shared_processors + [
            structlog.processors.format_exc_info,  # Format exceptions
            structlog.processors.JSONRenderer(),  # JSON output
        ]

        # Configure stdlib logging to use structlog
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=getattr(logging, log_level.upper()),
        )
    else:
        # Development: Pretty console output
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),  # Pretty colors
        ]

        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=logging.DEBUG,
        )

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


# Module-level logger
def get_logger(name: str | None = None) -> Any:
    """Get a configured logger instance"""
    return structlog.get_logger(name)

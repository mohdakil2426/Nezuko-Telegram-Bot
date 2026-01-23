"""
Sentry error tracking integration for GMBot v2.0.

Provides:
- Automatic exception capture and reporting
- User context (user_id, group_id) on errors
- Environment-aware configuration
- Integration with SQLAlchemy, Redis, and logging
- Graceful handling when SENTRY_DSN is not configured
"""

import logging
from typing import Optional, Dict, Any
from functools import wraps

# Sentry SDK (optional - graceful when not installed/configured)
try:
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    sentry_sdk = None

from bot.config import config

logger = logging.getLogger(__name__)

# Global state
_sentry_initialized = False


def init_sentry(dsn: Optional[str] = None, environment: Optional[str] = None) -> bool:
    """
    Initialize Sentry error tracking.
    
    Args:
        dsn: Sentry DSN. If None, uses SENTRY_DSN from config.
        environment: Environment name (development/production)
    
    Returns:
        True if Sentry initialized successfully, False otherwise
    """
    global _sentry_initialized
    
    if not SENTRY_AVAILABLE:
        logger.info("Sentry SDK not installed - error tracking disabled")
        return False
    
    dsn = dsn or config.SENTRY_DSN
    environment = environment or config.ENVIRONMENT
    
    if not dsn:
        logger.info("SENTRY_DSN not configured - error tracking disabled")
        return False
    
    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            
            # Integrations
            integrations=[
                LoggingIntegration(
                    level=logging.INFO,        # Capture INFO and above as breadcrumbs
                    event_level=logging.ERROR  # Send ERROR and above to Sentry
                ),
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
            
            # Performance monitoring (sample 10% of transactions)
            traces_sample_rate=0.1,
            
            # Release info
            release="gmbot@2.0.0",
            
            # Don't send PII by default
            send_default_pii=False,
            
            # Attach stacktrace to all message events
            attach_stacktrace=True,
            
            # Before send hook to filter/modify events
            before_send=_before_send,
            
            # Additional context
            _experiments={
                "profiles_sample_rate": 0.1,  # Profile 10% of transactions
            }
        )
        
        # Set initial tags
        sentry_sdk.set_tag("app", "gmbot")
        sentry_sdk.set_tag("version", "2.0.0")
        
        _sentry_initialized = True
        logger.info(f"✅ Sentry initialized ({environment})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Pre-process events before sending to Sentry.
    
    - Filter out known non-critical errors
    - Redact sensitive information
    - Add custom context
    """
    # Get exception info if available
    exception = hint.get("exc_info")
    if exception:
        exc_type, exc_value, _ = exception
        
        # Filter out specific non-critical errors
        # Example: Don't report user-caused errors like "user not admin"
        if exc_type.__name__ in ["BadRequest", "Forbidden"]:
            # Check if it's a permission-related error (expected behavior)
            error_msg = str(exc_value).lower()
            if "not enough rights" in error_msg or "chat not found" in error_msg:
                return None  # Don't send to Sentry
    
    # Redact any sensitive fields
    if "extra" in event:
        for key in list(event["extra"].keys()):
            if "token" in key.lower() or "secret" in key.lower() or "password" in key.lower():
                event["extra"][key] = "[REDACTED]"
    
    return event


def set_user_context(user_id: int, username: Optional[str] = None):
    """
    Set user context for Sentry error tracking.
    
    Args:
        user_id: Telegram user ID
        username: Optional Telegram username
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        return
    
    sentry_sdk.set_user({
        "id": str(user_id),
        "username": username or f"user_{user_id}"
    })


def set_chat_context(group_id: int, channel_id: Optional[int] = None):
    """
    Set chat context for Sentry error tracking.
    
    Args:
        group_id: Telegram group ID
        channel_id: Optional Telegram channel ID
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        return
    
    sentry_sdk.set_context("chat", {
        "group_id": str(group_id),
        "channel_id": str(channel_id) if channel_id else None
    })


def add_breadcrumb(
    message: str,
    category: str = "info",
    level: str = "info",
    data: Optional[Dict[str, Any]] = None
):
    """
    Add a breadcrumb to the Sentry trail.
    
    Breadcrumbs are events that happened leading up to an error.
    
    Args:
        message: Description of the event
        category: Category (e.g., 'verification', 'cache', 'database')
        level: Log level ('debug', 'info', 'warning', 'error')
        data: Additional data to attach
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        return
    
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )


def capture_exception(error: Exception, **context):
    """
    Capture and report an exception to Sentry.
    
    Args:
        error: Exception to capture
        **context: Additional context to attach
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        logger.error(f"Error (Sentry disabled): {error}", exc_info=error)
        return
    
    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", **context):
    """
    Capture and report a message to Sentry.
    
    Args:
        message: Message to capture
        level: One of 'debug', 'info', 'warning', 'error', 'fatal'
        **context: Additional context to attach
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        return
    
    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def sentry_trace(func):
    """
    Decorator to trace async function execution with Sentry.
    
    Usage:
        @sentry_trace
        async def my_handler(update, context):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not _sentry_initialized or not SENTRY_AVAILABLE:
            return await func(*args, **kwargs)
        
        with sentry_sdk.start_transaction(
            op="handler",
            name=func.__name__
        ) as transaction:
            try:
                result = await func(*args, **kwargs)
                transaction.set_status("ok")
                return result
            except Exception as e:
                transaction.set_status("internal_error")
                capture_exception(e, function=func.__name__)
                raise
    
    return wrapper


def start_transaction(name: str, op: str = "task"):
    """
    Start a Sentry transaction for performance monitoring.
    
    Usage:
        with start_transaction("verify_user", op="verification"):
            # Complex operation here
            pass
    
    Args:
        name: Transaction name
        op: Operation type
    
    Returns:
        Transaction context manager (or None if Sentry not available)
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        # Return a no-op context manager
        class NoOpTransaction:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def set_status(self, status): pass
        return NoOpTransaction()
    
    return sentry_sdk.start_transaction(name=name, op=op)


def flush(timeout: int = 2):
    """
    Flush pending events to Sentry.
    
    Call this before shutdown to ensure all events are sent.
    
    Args:
        timeout: Seconds to wait for flush
    """
    if not _sentry_initialized or not SENTRY_AVAILABLE:
        return
    
    sentry_sdk.flush(timeout=timeout)
    logger.info("Sentry events flushed")


def is_initialized() -> bool:
    """Check if Sentry is initialized."""
    return _sentry_initialized


def test_sentry():
    """
    Test Sentry integration by sending a test error.
    Only use this for verification purposes.
    """
    if not _sentry_initialized:
        logger.warning("Sentry not initialized - cannot test")
        return False
    
    try:
        # This will be captured by Sentry
        capture_message("Sentry integration test", level="info", test=True)
        logger.info("Test message sent to Sentry")
        return True
    except Exception as e:
        logger.error(f"Sentry test failed: {e}")
        return False

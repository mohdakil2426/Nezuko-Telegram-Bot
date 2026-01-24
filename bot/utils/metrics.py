"""
Prometheus metrics for GMBot v2.0.

Exposes key operational metrics for monitoring and alerting:
- Verification counts (verified, restricted, error)
- API call counts by method
- Cache hit/miss rates
- Rate limit delays
- Latency histograms (verification, database)
- Active groups gauge
"""

import time
from functools import wraps
from typing import Callable
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CollectorRegistry,
    CONTENT_TYPE_LATEST
)

# Custom registry for cleaner metrics (avoid default process/gc metrics in dev)
REGISTRY = CollectorRegistry()

# ====================
# Counters
# ====================

# Verification outcomes
VERIFICATIONS_TOTAL = Counter(
    "bot_verifications_total",
    "Total number of verification operations",
    ["status"],  # verified, restricted, error
    registry=REGISTRY
)

# Telegram API calls
API_CALLS_TOTAL = Counter(
    "bot_api_calls_total",
    "Total number of Telegram API calls",
    ["method"],  # getChatMember, restrictChatMember, sendMessage, deleteMessage
    registry=REGISTRY
)

# Cache operations
CACHE_HITS_TOTAL = Counter(
    "bot_cache_hits_total",
    "Total cache hits",
    registry=REGISTRY
)

CACHE_MISSES_TOTAL = Counter(
    "bot_cache_misses_total",
    "Total cache misses",
    registry=REGISTRY
)

# Rate limit delays
RATE_LIMIT_DELAYS_TOTAL = Counter(
    "bot_rate_limit_delays_total",
    "Total number of rate limit delays encountered",
    registry=REGISTRY
)

# Errors by type
ERRORS_TOTAL = Counter(
    "bot_errors_total",
    "Total errors by type",
    ["error_type"],  # telegram_error, database_error, cache_error, unknown
    registry=REGISTRY
)

# ====================
# Histograms
# ====================

# Verification latency (full cycle)
VERIFICATION_LATENCY = Histogram(
    "bot_verification_latency_seconds",
    "Verification operation latency in seconds",
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0),
    registry=REGISTRY
)

# Database query duration
DB_QUERY_DURATION = Histogram(
    "db_query_duration_seconds",
    "Database query duration in seconds",
    ["query_type"],  # get_protected_group, get_group_channels, create_owner, etc.
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
    registry=REGISTRY
)

# Cache operation duration
CACHE_OPERATION_DURATION = Histogram(
    "bot_cache_operation_seconds",
    "Cache operation duration in seconds",
    ["operation"],  # get, set, delete
    buckets=(0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1),
    registry=REGISTRY
)

# ====================
# Gauges
# ====================

# Active protected groups
ACTIVE_GROUPS = Gauge(
    "bot_active_groups",
    "Number of currently active (enabled) protected groups",
    registry=REGISTRY
)

# Bot uptime
BOT_START_TIME = Gauge(
    "bot_start_time_seconds",
    "Bot start time as Unix timestamp",
    registry=REGISTRY
)

# Redis connection status (1=connected, 0=disconnected)
REDIS_CONNECTED = Gauge(
    "bot_redis_connected",
    "Redis connection status (1=connected, 0=disconnected)",
    registry=REGISTRY
)

# Database connection status
DB_CONNECTED = Gauge(
    "bot_db_connected",
    "Database connection status (1=connected, 0=disconnected)",
    registry=REGISTRY
)


# ====================
# Helper Functions
# ====================

def record_verification_start() -> float:
    """Start timing a verification operation. Returns start time."""
    return time.perf_counter()


def record_verification_end(start_time: float, status: str = "verified"):
    """
    Record verification completion with latency.

    Args:
        start_time: Time from record_verification_start()
        status: One of 'verified', 'restricted', 'error'
    """
    duration = time.perf_counter() - start_time
    VERIFICATION_LATENCY.observe(duration)
    VERIFICATIONS_TOTAL.labels(status=status).inc()


def record_cache_hit():
    """Record a cache hit."""
    CACHE_HITS_TOTAL.inc()


def record_cache_miss():
    """Record a cache miss."""
    CACHE_MISSES_TOTAL.inc()


def record_api_call(method: str):
    """
    Record a Telegram API call.

    Args:
        method: API method name (e.g., 'getChatMember', 'restrictChatMember')
    """
    API_CALLS_TOTAL.labels(method=method).inc()


def record_rate_limit_delay():
    """Record that we hit a rate limit and had to delay."""
    RATE_LIMIT_DELAYS_TOTAL.inc()


def record_error(error_type: str = "unknown"):
    """
    Record an error occurrence.

    Args:
        error_type: One of 'telegram_error', 'database_error', 'cache_error', 'unknown'
    """
    ERRORS_TOTAL.labels(error_type=error_type).inc()


def record_db_query(query_type: str, duration: float):
    """
    Record a database query duration.

    Args:
        query_type: Query function name (e.g., 'get_protected_group')
        duration: Query duration in seconds
    """
    DB_QUERY_DURATION.labels(query_type=query_type).observe(duration)


def record_cache_operation(operation: str, duration: float):
    """
    Record a cache operation duration.

    Args:
        operation: One of 'get', 'set', 'delete'
        duration: Operation duration in seconds
    """
    CACHE_OPERATION_DURATION.labels(operation=operation).observe(duration)


def set_active_groups_count(count: int):
    """Set the current number of active protected groups."""
    ACTIVE_GROUPS.set(count)


def set_bot_start_time():
    """Record bot start time."""
    BOT_START_TIME.set(time.time())


def set_redis_connected(connected: bool):
    """Set Redis connection status."""
    REDIS_CONNECTED.set(1 if connected else 0)


def set_db_connected(connected: bool):
    """Set database connection status."""
    DB_CONNECTED.set(1 if connected else 0)


# ====================
# Decorators
# ====================

def timed_db_query(query_type: str):
    """
    Decorator to time async database queries.

    Usage:
        @timed_db_query("get_protected_group")
        async def get_protected_group(session, group_id):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.perf_counter() - start
                record_db_query(query_type, duration)
        return wrapper
    return decorator


def timed_cache_operation(operation: str):
    """
    Decorator to time async cache operations.

    Usage:
        @timed_cache_operation("get")
        async def cache_get(key):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.perf_counter() - start
                record_cache_operation(operation, duration)
        return wrapper
    return decorator


# ====================
# Metrics Endpoint
# ====================

def get_metrics() -> bytes:
    """
    Generate Prometheus-format metrics output.

    Returns:
        Bytes containing Prometheus text format metrics
    """
    return generate_latest(REGISTRY)


def get_metrics_content_type() -> str:
    """Get content type for Prometheus metrics."""
    return CONTENT_TYPE_LATEST


# ====================
# Utility Functions
# ====================

def get_stats_summary() -> dict:
    """
    Get a summary of current metrics for debugging/display.

    Returns:
        Dict with key metric values
    """
    # Note: This reads current metric values directly
    # In production, use Prometheus queries instead
    # pylint: disable=protected-access
    return {
        "verifications": {
            "verified": VERIFICATIONS_TOTAL.labels(status="verified")._value.get(),
            "restricted": VERIFICATIONS_TOTAL.labels(status="restricted")._value.get(),
            "error": VERIFICATIONS_TOTAL.labels(status="error")._value.get()
        },
        "cache": {
            "hits": CACHE_HITS_TOTAL._value.get(),
            "misses": CACHE_MISSES_TOTAL._value.get(),
            "hit_rate": calculate_cache_hit_rate()
        },
        "rate_limit_delays": RATE_LIMIT_DELAYS_TOTAL._value.get(),
        "active_groups": ACTIVE_GROUPS._value.get()
    }


def calculate_cache_hit_rate() -> float:
    """Calculate cache hit rate as percentage."""
    # pylint: disable=protected-access
    hits = CACHE_HITS_TOTAL._value.get()
    misses = CACHE_MISSES_TOTAL._value.get()
    total = hits + misses
    if total == 0:
        return 0.0
    return round((hits / total) * 100, 2)

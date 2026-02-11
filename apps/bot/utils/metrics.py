"""
Prometheus metrics for Nezuko.

Exposes key operational metrics for monitoring and alerting:
- Verification counts (verified, restricted, error)
- API call counts by method
- Cache hit/miss rates
- Rate limit delays
- Latency histograms (verification, database)
- Active groups gauge
"""

import time
from collections.abc import Callable
from functools import wraps

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
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
    ["bot_id", "status"],  # bot_id added, status: verified, restricted, error
    registry=REGISTRY,
)

# Telegram API calls
API_CALLS_TOTAL = Counter(
    "bot_api_calls_total",
    "Total number of Telegram API calls",
    ["bot_id", "method"],  # bot_id added, method: getChatMember, restrictChatMember, etc.
    registry=REGISTRY,
)

# Cache operations
CACHE_HITS_TOTAL = Counter(
    "bot_cache_hits_total",
    "Total cache hits",
    ["bot_id"],  # bot_id added for per-bot cache tracking
    registry=REGISTRY,
)

CACHE_MISSES_TOTAL = Counter(
    "bot_cache_misses_total",
    "Total cache misses",
    ["bot_id"],  # bot_id added for per-bot cache tracking
    registry=REGISTRY,
)

# Rate limit delays
RATE_LIMIT_DELAYS_TOTAL = Counter(
    "bot_rate_limit_delays_total",
    "Total number of rate limit delays encountered",
    ["bot_id"],  # bot_id added
    registry=REGISTRY,
)

# Errors by type
ERRORS_TOTAL = Counter(
    "bot_errors_total",
    "Total errors by type",
    ["bot_id", "error_type"],  # bot_id added, error_type: telegram_error, database_error, etc.
    registry=REGISTRY,
)

# ====================
# Histograms
# ====================

# Verification latency (full cycle)
VERIFICATION_LATENCY = Histogram(
    "bot_verification_latency_seconds",
    "Verification operation latency in seconds",
    ["bot_id"],  # bot_id added
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0),
    registry=REGISTRY,
)

# Database query duration
DB_QUERY_DURATION = Histogram(
    "db_query_duration_seconds",
    "Database query duration in seconds",
    ["bot_id", "query_type"],  # bot_id added, query_type: get_protected_group, etc.
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
    registry=REGISTRY,
)

# Cache operation duration
CACHE_OPERATION_DURATION = Histogram(
    "bot_cache_operation_seconds",
    "Cache operation duration in seconds",
    ["bot_id", "operation"],  # bot_id added, operation: get, set, delete
    buckets=(0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1),
    registry=REGISTRY,
)

# ====================
# Gauges
# ====================

# Active protected groups (per bot)
ACTIVE_GROUPS = Gauge(
    "bot_active_groups",
    "Number of currently active (enabled) protected groups",
    ["bot_id"],  # bot_id added
    registry=REGISTRY,
)

# Bot uptime (per bot)
BOT_START_TIME = Gauge(
    "bot_start_time_seconds",
    "Bot start time as Unix timestamp",
    ["bot_id"],  # bot_id added
    registry=REGISTRY,
)

# Redis connection status (1=connected, 0=disconnected)
REDIS_CONNECTED = Gauge(
    "bot_redis_connected",
    "Redis connection status (1=connected, 0=disconnected)",
    ["bot_id"],  # bot_id added
    registry=REGISTRY,
)

# Database connection status (per bot)
DB_CONNECTED = Gauge(
    "bot_db_connected",
    "Database connection status (1=connected, 0=disconnected)",
    ["bot_id"],  # bot_id added
    registry=REGISTRY,
)


# ====================
# Helper Functions
# ====================


def record_verification_start() -> float:
    """Start timing a verification operation. Returns start time."""
    return time.perf_counter()


def record_verification_end(start_time: float, status: str = "verified", bot_id: int = 0):
    """
    Record verification completion with latency.

    Args:
        start_time: Time from record_verification_start()
        status: One of 'verified', 'restricted', 'error'
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    duration = time.perf_counter() - start_time
    VERIFICATION_LATENCY.labels(bot_id=str(bot_id)).observe(duration)
    VERIFICATIONS_TOTAL.labels(bot_id=str(bot_id), status=status).inc()


def record_cache_hit(bot_id: int = 0):
    """Record a cache hit.

    Args:
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    CACHE_HITS_TOTAL.labels(bot_id=str(bot_id)).inc()


def record_cache_miss(bot_id: int = 0):
    """Record a cache miss.

    Args:
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    CACHE_MISSES_TOTAL.labels(bot_id=str(bot_id)).inc()


def record_api_call(method: str, bot_id: int = 0):
    """
    Record a Telegram API call.

    Args:
        method: API method name (e.g., 'getChatMember', 'restrictChatMember')
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    API_CALLS_TOTAL.labels(bot_id=str(bot_id), method=method).inc()


def record_rate_limit_delay(bot_id: int = 0):
    """Record that we hit a rate limit and had to delay.

    Args:
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    RATE_LIMIT_DELAYS_TOTAL.labels(bot_id=str(bot_id)).inc()


def record_error(error_type: str = "unknown", bot_id: int = 0):
    """
    Record an error occurrence.

    Args:
        error_type: One of 'telegram_error', 'database_error', 'cache_error', 'unknown'
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    ERRORS_TOTAL.labels(bot_id=str(bot_id), error_type=error_type).inc()


def record_db_query(query_type: str, duration: float, bot_id: int = 0):
    """
    Record a database query duration.

    Args:
        query_type: Query function name (e.g., 'get_protected_group')
        duration: Query duration in seconds
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    DB_QUERY_DURATION.labels(bot_id=str(bot_id), query_type=query_type).observe(duration)


def record_cache_operation(operation: str, duration: float, bot_id: int = 0):
    """
    Record a cache operation duration.

    Args:
        operation: One of 'get', 'set', 'delete'
        duration: Operation duration in seconds
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    CACHE_OPERATION_DURATION.labels(bot_id=str(bot_id), operation=operation).observe(duration)


def set_active_groups_count(count: int, bot_id: int = 0):
    """Set the current number of active protected groups.

    Args:
        count: Number of active groups
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    ACTIVE_GROUPS.labels(bot_id=str(bot_id)).set(count)


def set_bot_start_time(bot_id: int = 0):
    """Record bot start time.

    Args:
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    BOT_START_TIME.labels(bot_id=str(bot_id)).set(time.time())


def set_redis_connected(connected: bool, bot_id: int = 0):
    """Set Redis connection status.

    Args:
        connected: Connection status
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    REDIS_CONNECTED.labels(bot_id=str(bot_id)).set(1 if connected else 0)


def set_db_connected(connected: bool, bot_id: int = 0):
    """Set database connection status.

    Args:
        connected: Connection status
        bot_id: Bot instance ID (default 0 for standalone mode)
    """
    DB_CONNECTED.labels(bot_id=str(bot_id)).set(1 if connected else 0)


# ====================
# Decorators
# ====================


def timed_db_query(bot_id: int, query_type: str):
    """
    Decorator to time async database queries.

    Usage:
        @timed_db_query(bot_id=1, query_type="get_protected_group")
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
                record_db_query(query_type, duration, bot_id)

        return wrapper

    return decorator


def timed_cache_operation(bot_id: int, operation: str):
    """
    Decorator to time async cache operations.

    Usage:
        @timed_cache_operation(bot_id=1, operation="get")
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
                record_cache_operation(operation, duration, bot_id)

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
    return generate_latest(REGISTRY)  # type: ignore[no-any-return]


def get_metrics_content_type() -> str:
    """Get content type for Prometheus metrics."""
    return CONTENT_TYPE_LATEST  # type: ignore[no-any-return]


# ====================
# Utility Functions
# ====================


def get_stats_summary(bot_id: int) -> dict:
    """
    Get a summary of current metrics for debugging/display.

    Args:
        bot_id: Bot instance ID

    Returns:
        Dict with key metric values for the specified bot
    """
    # Note: This reads current metric values directly
    # In production, use Prometheus queries instead
    # pylint: disable=protected-access
    bot_id_str = str(bot_id)
    return {
        "bot_id": bot_id,
        "verifications": {
            "verified": VERIFICATIONS_TOTAL.labels(
                bot_id=bot_id_str, status="verified"
            )._value.get(),
            "restricted": VERIFICATIONS_TOTAL.labels(
                bot_id=bot_id_str, status="restricted"
            )._value.get(),
            "error": VERIFICATIONS_TOTAL.labels(bot_id=bot_id_str, status="error")._value.get(),
        },
        "cache": {
            "hits": CACHE_HITS_TOTAL.labels(bot_id=bot_id_str)._value.get(),
            "misses": CACHE_MISSES_TOTAL.labels(bot_id=bot_id_str)._value.get(),
            "hit_rate": calculate_cache_hit_rate(bot_id),
        },
        "rate_limit_delays": RATE_LIMIT_DELAYS_TOTAL.labels(bot_id=bot_id_str)._value.get(),
        "active_groups": ACTIVE_GROUPS.labels(bot_id=bot_id_str)._value.get(),
    }


def calculate_cache_hit_rate(bot_id: int) -> float:
    """Calculate cache hit rate as percentage for a specific bot.

    Args:
        bot_id: Bot instance ID

    Returns:
        Cache hit rate as percentage
    """
    # pylint: disable=protected-access
    bot_id_str = str(bot_id)
    hits = CACHE_HITS_TOTAL.labels(bot_id=bot_id_str)._value.get()
    misses = CACHE_MISSES_TOTAL.labels(bot_id=bot_id_str)._value.get()
    total = hits + misses
    if total == 0:
        return 0.0
    return round((hits / total) * 100, 2)  # type: ignore[no-any-return]

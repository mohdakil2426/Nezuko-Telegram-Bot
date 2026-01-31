# 12. Observability (Logging, Metrics, Tracing)

## Structured Logging with Structlog

**RULE: Every log entry must have context. Use Structlog for structured, queryable logs.**

```python
# ✅ CORRECT: Structured logging
import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ✅ CORRECT: Rich context in logs
async def process_user_request(user_id: str, request_type: str):
    logger.info(
        "Processing request",
        user_id=user_id,
        request_type=request_type,
        timestamp=datetime.utcnow().isoformat(),
    )
    
    try:
        result = await process(request_type)
        logger.info(
            "Request completed",
            user_id=user_id,
            status="success",
            result_size=len(result),
        )
        return result
    except Exception as e:
        logger.error(
            "Request failed",
            user_id=user_id,
            error_type=type(e).__name__,
            error_message=str(e),
            exc_info=e,
        )
        raise

# ✅ CORRECT: Request-scoped context
from contextvars import ContextVar

request_context: ContextVar[dict] = ContextVar("request_context", default={})

@app.middleware("http")
async def add_logging_context(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    
    context = {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "client_ip": request.client.host if request.client else None,
    }
    
    token = request_context.set(context)
    try:
        response = await call_next(request)
        return response
    finally:
        request_context.reset(token)

# Log with context
logger.info("Processing", **request_context.get())

# ❌ WRONG: Unstructured logging
logger.info(f"User {user_id} processed: {result}")

# ❌ WRONG: No context
logger.error("Error occurred")

# ❌ WRONG: Sensitive data in logs
logger.info(f"User logged in with password: {password}")
```

## Metrics & Prometheus

**RULE: Instrument critical paths. Track request latency, error rates, and resource usage.**

```python
# ✅ CORRECT: Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

request_count = Counter(
    "requests_total",
    "Total requests",
    ["method", "endpoint", "status"],
)

request_latency = Histogram(
    "request_duration_seconds",
    "Request latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.5],
)

db_connection_pool = Gauge(
    "database_connection_pool_size",
    "Active database connections",
)

# ✅ CORRECT: Middleware to capture metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    import time
    
    start = time.time()
    response = await call_next(request)
    
    duration = time.time() - start
    
    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()
    
    request_latency.labels(
        method=request.method,
        endpoint=request.url.path,
    ).observe(duration)
    
    return response

# ✅ CORRECT: Expose metrics endpoint
from prometheus_client import generate_latest

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

# ❌ WRONG: No metrics collection
# No observability into performance

# ❌ WRONG: Metrics with too many labels
Counter("requests_total", ["user_id", "endpoint", "status"])
# Cardinality explosion if user_id is unbounded
```

## Sentry Error Tracking

**RULE: Use Sentry for production error tracking. All unhandled exceptions should be reported.**

```python
# ✅ CORRECT: Sentry integration
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,  # Sample 10% of requests for tracing
    before_send=filter_sensitive_data,  # Custom filter
)

def filter_sensitive_data(event, hint):
    """Remove sensitive data before sending to Sentry."""
    if 'request' in event:
        event['request'].pop('headers', None)  # Remove auth headers
        event['request'].pop('cookies', None)
    return event

# ✅ CORRECT: Manual error tracking
try:
    result = await process_request()
except Exception as e:
    sentry_sdk.capture_exception(e)
    raise

# ✅ CORRECT: Custom context
with sentry_sdk.push_scope() as scope:
    scope.set_context("user", {"user_id": user.id, "tenant_id": user.tenant_id})
    try:
        await process_user_data()
    except Exception:
        raise  # Sentry captures with user context

# ❌ WRONG: Not configuring Sentry
# Errors happen silently in production

# ❌ WRONG: Sending sensitive data to Sentry
# Must configure `before_send` filter
```

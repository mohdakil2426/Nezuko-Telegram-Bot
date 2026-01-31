# Error Handling & Retry Strategies

## Exception Hierarchy

**RULE: Define custom exceptions for domain errors. Never use bare `Exception` or `raise Exception()`.**

```python
# ✅ CORRECT: Domain-specific exception hierarchy
class ApplicationError(Exception):
    """Base application error."""
    pass

class ValidationError(ApplicationError):
    """Input validation failed."""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")

class NotFoundError(ApplicationError):
    """Resource not found."""
    def __init__(self, resource: str, identifier: str):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} with id {identifier} not found")

class ExternalServiceError(ApplicationError):
    """External service call failed."""
    def __init__(self, service: str, status_code: int = None):
        self.service = service
        self.status_code = status_code
        super().__init__(f"{service} service error" + (f" ({status_code})" if status_code else ""))

class RateLimitError(ApplicationError):
    """Rate limit exceeded."""
    def __init__(self, retry_after: int = None):
        self.retry_after = retry_after
        super().__init__("Rate limit exceeded")

# Usage
async def get_user(user_id: str) -> User:
    user = await db.get_user(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    return user

# ❌ WRONG: Bare exceptions
raise Exception("User not found")
raise Exception(f"Validation failed for field {field}")
```

## Structured Error Responses

**RULE: Return consistent error responses with error codes, messages, and details.**

```python
from pydantic import BaseModel
from typing import Optional, Any

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Optional[dict[str, Any]] = None
    request_id: Optional[str] = None
    timestamp: str

# ✅ CORRECT: Global exception handler
@app.exception_handler(ApplicationError)
async def application_error_handler(request: Request, exc: ApplicationError):
    error_map = {
        ValidationError: (400, "VALIDATION_ERROR"),
        NotFoundError: (404, "NOT_FOUND"),
        RateLimitError: (429, "RATE_LIMIT_EXCEEDED"),
        ExternalServiceError: (502, "EXTERNAL_SERVICE_ERROR"),
    }
    
    status_code, error_code = error_map.get(type(exc), (500, "INTERNAL_ERROR"))
    
    # Log with context
    logger.error(
        "Application error",
        exc_info=exc,
        extra={
            "error_code": error_code,
            "request_id": request.state.request_id,
            "path": request.url.path,
        }
    )
    
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error_code=error_code,
            message=str(exc),
            details=getattr(exc, "__dict__", None),
            request_id=request.state.request_id,
            timestamp=datetime.utcnow().isoformat(),
        ).dict()
    )

# ❌ WRONG: Inconsistent error responses
@app.exception_handler(ValidationError)
async def validation_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)}  # Missing error_code, request_id
    )

@app.exception_handler(NotFoundError)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Not found", "resource": exc.resource}  # Different structure
    )
```

## Retry Strategies

**RULE: Implement exponential backoff with jitter for transient failures. Never retry on 4xx errors.**

```python
import random
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    before_sleep_log,
)

# ✅ CORRECT: Exponential backoff with jitter
@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential_jitter(initial=1, max=60, jitter=2),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_external_api(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=10) as response:
            response.raise_for_status()
            return await response.json()

# ✅ CORRECT: Manual retry with circuit breaker pattern
class CircuitBreaker:
    """Simple circuit breaker for external services."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

# Usage
breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)

async def fetch_with_circuit_breaker(url: str):
    return await breaker.call(fetch_external_api, url)

# ❌ WRONG: Fixed retry interval
async def fetch_with_retry(url: str, max_attempts: int = 3):
    for attempt in range(max_attempts):
        try:
            return await fetch_external_api(url)
        except Exception:
            if attempt < max_attempts - 1:
                await asyncio.sleep(5)  # Fixed interval—causes thundering herd
            raise

# ❌ WRONG: Retrying on 4xx errors
@retry(stop=stop_after_attempt(3))
async def fetch_user(user_id: str):
    response = await http_client.get(f"/users/{user_id}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()
# If user_id is invalid, this will retry 3 times—wasteful
```

## Idempotency Keys

**RULE: Use idempotency keys for operations that must not be duplicated (payments, writes, etc.).**

```python
from uuid import uuid4

# ✅ CORRECT: Idempotency key handling
async def process_payment(
    payment_request: PaymentRequest,
    idempotency_key: Optional[str] = None
) -> PaymentResult:
    """Process payment with idempotency guarantee."""
    
    key = idempotency_key or str(uuid4())
    
    # Check if already processed
    cached_result = await redis.get(f"idempotency:{key}")
    if cached_result:
        logger.info("Returning cached idempotent result", extra={"key": key})
        return PaymentResult.parse_raw(cached_result)
    
    # Process payment
    try:
        result = await payment_gateway.charge(payment_request)
        
        # Cache result for 24 hours
        await redis.setex(
            f"idempotency:{key}",
            86400,
            result.json()
        )
        
        return result
    except Exception as e:
        # Don't cache failures—allow retry
        logger.error("Payment failed", exc_info=e, extra={"key": key})
        raise

@app.post("/payments")
async def create_payment(
    request: PaymentRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    result = await process_payment(request, idempotency_key)
    return result

# ❌ WRONG: No idempotency protection
@app.post("/payments")
async def create_payment(request: PaymentRequest):
    result = await payment_gateway.charge(request)  # Could be duplicated
    return result
```

## Error Context & Correlation

**RULE: Include request_id and correlation_id in all error logs for traceability.**

```python
from contextvars import ContextVar

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id")
correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)

# ✅ CORRECT: Middleware to set context
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    correlation_id = request.headers.get("X-Correlation-ID")
    
    request_id_var.set(request_id)
    correlation_id_var.set(correlation_id)
    
    request.state.request_id = request_id
    request.state.correlation_id = correlation_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# ✅ CORRECT: Structured logging with context
class ContextualLogger:
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def _get_context(self) -> dict:
        return {
            "request_id": request_id_var.get(None),
            "correlation_id": correlation_id_var.get(None),
        }
    
    def error(self, message: str, exc_info=None, extra: dict = None):
        context = self._get_context()
        if extra:
            context.update(extra)
        self.logger.error(message, exc_info=exc_info, extra=context)
    
    def warning(self, message: str, extra: dict = None):
        context = self._get_context()
        if extra:
            context.update(extra)
        self.logger.warning(message, extra=context)

logger = ContextualLogger(logging.getLogger(__name__))

# ❌ WRONG: Logging without context
async def process_request(request: Request):
    try:
        result = await do_work()
    except Exception as e:
        logger.error(f"Error: {e}")  # No request_id, no traceability
        raise
```

## Graceful Degradation

**RULE: When non-critical services fail, degrade gracefully instead of failing the entire request.**

```python
# ✅ CORRECT: Graceful degradation pattern
async def get_user_profile(user_id: str) -> UserProfile:
    """Get user profile with graceful degradation."""
    
    # Critical: Get from primary database
    user = await db.get_user(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    
    # Non-critical: Get from cache (degrade to DB if cache fails)
    try:
        cached_stats = await redis.get(f"user_stats:{user_id}")
        stats = UserStats.parse_raw(cached_stats) if cached_stats else None
    except Exception as e:
        logger.warning("Cache fetch failed, degrading to DB", exc_info=e)
        stats = await db.get_user_stats(user_id)
    
    # Non-critical: Get from external service (degrade to default if fails)
    try:
        recommendations = await recommendation_service.get(user_id)
    except ExternalServiceError as e:
        logger.warning("Recommendation service failed, using defaults", exc_info=e)
        recommendations = DEFAULT_RECOMMENDATIONS
    
    return UserProfile(
        user=user,
        stats=stats or UserStats(),
        recommendations=recommendations,
    )

# ❌ WRONG: All-or-nothing approach
async def get_user_profile_wrong(user_id: str) -> UserProfile:
    user = await db.get_user(user_id)
    stats = await redis.get(f"user_stats:{user_id}")  # If this fails, whole request fails
    recommendations = await recommendation_service.get(user_id)  # If this fails, whole request fails
    return UserProfile(user=user, stats=stats, recommendations=recommendations)
```

---

[← Back to Firebase Integration](./06-firebase-integration.md) | [Next: Security & Authorization →](./08-security.md)

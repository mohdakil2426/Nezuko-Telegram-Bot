# 🚨 Error Handling & Logging Framework

> **Nezuko Admin Panel - Production-Grade Observability (2026 Standards)**
> 
> **Last Updated**: January 24, 2026  
> **Standards**: RFC 9457 (Problem Details), OpenTelemetry, Structlog

---

## 📋 Table of Contents

| Section                                                      | Focus                            |
| ------------------------------------------------------------ | -------------------------------- |
| [1. Error Response Format](#1-error-response-format)         | RFC 9457 Problem Details         |
| [2. Global Exception Handling](#2-global-exception-handling) | FastAPI middleware               |
| [3. Error Codes Catalog](#3-error-codes-catalog)             | Standardized error codes         |
| [4. Structured Logging](#4-structured-logging)               | Structlog configuration          |
| [5. Log Levels Strategy](#5-log-levels-strategy)             | When to use each level           |
| [6. Request Correlation](#6-request-correlation)             | Distributed tracing              |
| [7. Frontend Error Handling](#7-frontend-error-handling)     | Next.js error boundaries         |
| [8. Log Rotation & Retention](#8-log-rotation--retention)    | Docker log management            |
| [9. Error Recovery Strategies](#9-error-recovery-strategies) | Retry, fallback, circuit breaker |

---

## 1. Error Response Format

### 1.1 RFC 9457 Problem Details (Standard)

All API errors follow the **RFC 9457 Problem Details** specification for consistent, machine-readable error responses.

```python
# ============================================
# ERROR RESPONSE SCHEMA (PYDANTIC V2)
# ============================================
from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime, timezone

class ErrorResponse(BaseModel):
    """RFC 9457 Problem Details compliant error response"""
    
    # Required fields
    type: str = Field(
        description="URI reference identifying error type",
        examples=["https://api.nezuko.bot/errors/auth/invalid-credentials"]
    )
    title: str = Field(
        description="Human-readable error summary",
        examples=["Invalid Credentials"]
    )
    status: int = Field(
        description="HTTP status code",
        examples=[401]
    )
    
    # Recommended fields
    detail: str = Field(
        description="Explanation specific to this occurrence",
        examples=["The provided email or password is incorrect."]
    )
    instance: str = Field(
        description="URI reference to the specific occurrence",
        examples=["/api/v1/auth/login"]
    )
    
    # Extension fields (custom)
    code: str = Field(
        description="Application-specific error code",
        examples=["AUTH_001"]
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When the error occurred"
    )
    trace_id: str | None = Field(
        default=None,
        description="Request correlation ID for tracing"
    )
    errors: list[dict[str, Any]] | None = Field(
        default=None,
        description="Validation errors (field-level details)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "https://api.nezuko.bot/errors/auth/invalid-credentials",
                "title": "Invalid Credentials",
                "status": 401,
                "detail": "The provided email or password is incorrect.",
                "instance": "/api/v1/auth/login",
                "code": "AUTH_001",
                "timestamp": "2026-01-24T15:30:00Z",
                "trace_id": "abc123-def456-ghi789"
            }
        }
    }
```

### 1.2 Example Error Responses

#### Authentication Error (401)

```json
{
  "type": "https://api.nezuko.bot/errors/auth/invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The provided email or password is incorrect.",
  "instance": "/api/v1/auth/login",
  "code": "AUTH_001",
  "timestamp": "2026-01-24T15:30:00Z",
  "trace_id": "abc123-def456-ghi789"
}
```

#### Validation Error (422)

```json
{
  "type": "https://api.nezuko.bot/errors/validation/invalid-input",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Request body contains invalid or missing fields.",
  "instance": "/api/v1/groups",
  "code": "VAL_001",
  "timestamp": "2026-01-24T15:30:00Z",
  "trace_id": "abc123-def456-ghi789",
  "errors": [
    {
      "field": "channel_id",
      "message": "Channel ID must be a negative integer for channels",
      "value": 12345
    },
    {
      "field": "welcome_message",
      "message": "Message exceeds maximum length of 4096 characters",
      "value": "..."
    }
  ]
}
```

#### Rate Limit Error (429)

```json
{
  "type": "https://api.nezuko.bot/errors/rate-limit/exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit of 100 requests per minute.",
  "instance": "/api/v1/groups",
  "code": "RATE_001",
  "timestamp": "2026-01-24T15:30:00Z",
  "trace_id": "abc123-def456-ghi789",
  "retry_after": 45
}
```

#### Server Error (500)

```json
{
  "type": "https://api.nezuko.bot/errors/server/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again later.",
  "instance": "/api/v1/groups/123",
  "code": "SRV_001",
  "timestamp": "2026-01-24T15:30:00Z",
  "trace_id": "abc123-def456-ghi789"
}
```

---

## 2. Global Exception Handling

### 2.1 Custom Exception Classes

```python
# ============================================
# CUSTOM EXCEPTIONS (apps/api/src/core/exceptions.py)
# ============================================
from typing import Any

class AppException(Exception):
    """Base exception for all application errors"""
    
    def __init__(
        self,
        code: str,
        title: str,
        detail: str,
        status_code: int = 400,
        errors: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ):
        self.code = code
        self.title = title
        self.detail = detail
        self.status_code = status_code
        self.errors = errors
        self.headers = headers
        super().__init__(detail)


# Authentication Errors
class AuthenticationError(AppException):
    """Invalid credentials or token"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            code="AUTH_001",
            title="Authentication Failed",
            detail=detail,
            status_code=401,
        )


class TokenExpiredError(AppException):
    """JWT token has expired"""
    def __init__(self):
        super().__init__(
            code="AUTH_002",
            title="Token Expired",
            detail="Your session has expired. Please login again.",
            status_code=401,
        )


class InsufficientPermissionsError(AppException):
    """User lacks required permissions"""
    def __init__(self, required_role: str = "admin"):
        super().__init__(
            code="AUTH_003",
            title="Insufficient Permissions",
            detail=f"This action requires '{required_role}' role or higher.",
            status_code=403,
        )


# Resource Errors
class ResourceNotFoundError(AppException):
    """Requested resource does not exist"""
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="RES_001",
            title="Resource Not Found",
            detail=f"{resource} with identifier '{identifier}' was not found.",
            status_code=404,
        )


class ResourceConflictError(AppException):
    """Resource already exists or conflict"""
    def __init__(self, detail: str):
        super().__init__(
            code="RES_002",
            title="Resource Conflict",
            detail=detail,
            status_code=409,
        )


# Validation Errors
class ValidationError(AppException):
    """Request body validation failed"""
    def __init__(self, errors: list[dict[str, Any]]):
        super().__init__(
            code="VAL_001",
            title="Validation Failed",
            detail="Request body contains invalid or missing fields.",
            status_code=422,
            errors=errors,
        )


# Rate Limit Errors
class RateLimitError(AppException):
    """Rate limit exceeded"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            code="RATE_001",
            title="Rate Limit Exceeded",
            detail=f"You have exceeded the rate limit. Retry after {retry_after} seconds.",
            status_code=429,
            headers={"Retry-After": str(retry_after)},
        )


# Database Errors
class DatabaseError(AppException):
    """Database operation failed"""
    def __init__(self, detail: str = "A database error occurred"):
        super().__init__(
            code="DB_001",
            title="Database Error",
            detail=detail,
            status_code=500,
        )


# External Service Errors
class ExternalServiceError(AppException):
    """External service (Redis, Telegram) unavailable"""
    def __init__(self, service: str):
        super().__init__(
            code="EXT_001",
            title="External Service Error",
            detail=f"The {service} service is currently unavailable.",
            status_code=503,
        )
```

### 2.2 Global Exception Handler Middleware

```python
# ============================================
# EXCEPTION HANDLER (apps/api/src/middleware/error_handler.py)
# ============================================
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from datetime import datetime, timezone
import structlog

from core.exceptions import AppException
from core.context import get_trace_id

logger = structlog.get_logger()

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
        
        response_body = {
            "type": f"https://api.nezuko.bot/errors/{exc.code.lower().replace('_', '-')}",
            "title": exc.title,
            "status": exc.status_code,
            "detail": exc.detail,
            "instance": request.url.path,
            "code": exc.code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors"""
        trace_id = get_trace_id()
        
        # Transform Pydantic errors to our format
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body'
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"],
            })
        
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trace_id": trace_id,
                "errors": errors,
            },
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trace_id": trace_id,  # Include trace_id for support tickets
            },
        )


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
```

---

## 3. Error Codes Catalog

### 3.1 Error Code Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ERROR CODE FORMAT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [CATEGORY]_[NUMBER]                                                       │
│                                                                             │
│   Examples:                                                                 │
│   • AUTH_001  → Authentication error #1 (invalid credentials)              │
│   • VAL_002   → Validation error #2 (invalid email format)                 │
│   • DB_001    → Database error #1 (connection failed)                      │
│                                                                             │
│   Categories:                                                               │
│   • AUTH  → Authentication & Authorization                                 │
│   • VAL   → Validation                                                     │
│   • RES   → Resource (CRUD operations)                                     │
│   • RATE  → Rate Limiting                                                  │
│   • DB    → Database                                                       │
│   • EXT   → External Services                                              │
│   • SRV   → Server (Internal)                                              │
│   • WS    → WebSocket                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Complete Error Codes Reference

#### Authentication Errors (AUTH_XXX)

| Code       | HTTP | Title                    | Description                          |
| ---------- | ---- | ------------------------ | ------------------------------------ |
| `AUTH_001` | 401  | Invalid Credentials      | Email or password is incorrect       |
| `AUTH_002` | 401  | Token Expired            | JWT access token has expired         |
| `AUTH_003` | 403  | Insufficient Permissions | User lacks required role             |
| `AUTH_004` | 401  | Token Invalid            | JWT token is malformed or invalid    |
| `AUTH_005` | 401  | Refresh Token Expired    | Refresh token has expired            |
| `AUTH_006` | 401  | Session Revoked          | User session was manually revoked    |
| `AUTH_007` | 403  | Account Disabled         | User account is disabled             |
| `AUTH_008` | 401  | MFA Required             | Multi-factor authentication required |
| `AUTH_009` | 401  | MFA Invalid              | MFA code is incorrect                |

#### Validation Errors (VAL_XXX)

| Code      | HTTP | Title               | Description                                   |
| --------- | ---- | ------------------- | --------------------------------------------- |
| `VAL_001` | 422  | Validation Failed   | Generic validation error (see `errors` array) |
| `VAL_002` | 422  | Invalid Email       | Email format is invalid                       |
| `VAL_003` | 422  | Password Too Weak   | Password doesn't meet requirements            |
| `VAL_004` | 422  | Invalid Telegram ID | Telegram ID format is invalid                 |
| `VAL_005` | 422  | Message Too Long    | Message exceeds 4096 characters               |
| `VAL_006` | 422  | Invalid JSON        | Request body is not valid JSON                |

#### Resource Errors (RES_XXX)

| Code      | HTTP | Title              | Description                           |
| --------- | ---- | ------------------ | ------------------------------------- |
| `RES_001` | 404  | Resource Not Found | Requested resource doesn't exist      |
| `RES_002` | 409  | Resource Conflict  | Resource already exists               |
| `RES_003` | 409  | Resource In Use    | Cannot delete, resource is referenced |
| `RES_004` | 410  | Resource Deleted   | Resource was permanently deleted      |

#### Rate Limit Errors (RATE_XXX)

| Code       | HTTP | Title               | Description                  |
| ---------- | ---- | ------------------- | ---------------------------- |
| `RATE_001` | 429  | Rate Limit Exceeded | Too many requests            |
| `RATE_002` | 429  | Login Rate Limited  | Too many login attempts      |
| `RATE_003` | 429  | API Quota Exceeded  | Daily/monthly quota exceeded |

#### Database Errors (DB_XXX)

| Code     | HTTP | Title                | Description                       |
| -------- | ---- | -------------------- | --------------------------------- |
| `DB_001` | 500  | Database Error       | Generic database error            |
| `DB_002` | 503  | Database Unavailable | Cannot connect to database        |
| `DB_003` | 500  | Transaction Failed   | Database transaction rolled back  |
| `DB_004` | 409  | Constraint Violation | Unique constraint or FK violation |

#### External Service Errors (EXT_XXX)

| Code      | HTTP | Title                  | Description                    |
| --------- | ---- | ---------------------- | ------------------------------ |
| `EXT_001` | 503  | External Service Error | Generic external service error |
| `EXT_002` | 503  | Redis Unavailable      | Cannot connect to Redis        |
| `EXT_003` | 503  | Telegram API Error     | Telegram API returned an error |
| `EXT_004` | 504  | External Timeout       | External service timed out     |

#### Server Errors (SRV_XXX)

| Code      | HTTP | Title                 | Description                   |
| --------- | ---- | --------------------- | ----------------------------- |
| `SRV_001` | 500  | Internal Server Error | Unhandled server exception    |
| `SRV_002` | 503  | Service Unavailable   | Server is in maintenance mode |
| `SRV_003` | 500  | Configuration Error   | Server misconfiguration       |

#### WebSocket Errors (WS_XXX)

| Code     | HTTP | Title                   | Description                      |
| -------- | ---- | ----------------------- | -------------------------------- |
| `WS_001` | 1008 | Authentication Required | WebSocket auth failed            |
| `WS_002` | 1008 | Connection Limit        | Max connections per user reached |
| `WS_003` | 1008 | Message Rate Limited    | Too many messages per second     |
| `WS_004` | 1011 | Server Error            | WebSocket server error           |

---

## 4. Structured Logging

### 4.1 Structlog Configuration

```python
# ============================================
# LOGGING CONFIGURATION (apps/api/src/core/logging.py)
# ============================================
import structlog
import logging
import sys
from typing import Any

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
        structlog.stdlib.add_log_level,           # Add log level
        structlog.stdlib.add_logger_name,         # Add logger name
        structlog.processors.TimeStamper(fmt="iso", utc=True),  # ISO timestamp
        structlog.processors.StackInfoRenderer(), # Stack info for exceptions
        structlog.processors.UnicodeDecoder(),    # Handle unicode
    ]
    
    if environment == "production":
        # Production: JSON output for log aggregation
        processors = shared_processors + [
            structlog.processors.format_exc_info,  # Format exceptions
            structlog.processors.JSONRenderer(),   # JSON output
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
def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance"""
    return structlog.get_logger(name)
```

### 4.2 Structured Log Examples

```python
# ============================================
# LOGGING EXAMPLES
# ============================================
import structlog

logger = structlog.get_logger()

# ✅ GOOD: Structured log with context
logger.info(
    "user_login_success",
    user_id="uuid-123",
    email="user@example.com",
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0...",
)

# ✅ GOOD: Error with exception context
try:
    await database.execute(query)
except Exception as e:
    logger.exception(
        "database_query_failed",
        query_type="select",
        table="protected_groups",
        error_message=str(e),
    )

# ❌ BAD: Unstructured log
logger.info(f"User {email} logged in from {ip}")

# ❌ BAD: Sensitive data in logs
logger.info("password_reset", password=new_password)  # NEVER!
```

### 4.3 Production Log Output (JSON)

```json
{
  "event": "user_login_success",
  "user_id": "uuid-123",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "level": "info",
  "logger": "auth_service",
  "timestamp": "2026-01-24T15:30:00.123456Z",
  "trace_id": "abc123-def456"
}
```

---

## 5. Log Levels Strategy

### 5.1 When to Use Each Level

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOG LEVELS GUIDE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🔴 CRITICAL (50)                                                          │
│   ├── System is unusable, immediate action required                        │
│   ├── Examples:                                                            │
│   │   • Database connection permanently lost                               │
│   │   • Security breach detected                                           │
│   │   • Application cannot start                                           │
│   └── Action: Page on-call, wake people up                                 │
│                                                                             │
│   🟠 ERROR (40)                                                             │
│   ├── Operation failed, but system continues                               │
│   ├── Examples:                                                            │
│   │   • Unhandled exception in request handler                             │
│   │   • Third-party API returned unexpected error                          │
│   │   • Database transaction rolled back                                   │
│   └── Action: Create alert, investigate within hours                       │
│                                                                             │
│   🟡 WARNING (30)                                                           │
│   ├── Something unexpected, but recoverable                                │
│   ├── Examples:                                                            │
│   │   • Rate limit approaching threshold                                   │
│   │   • Deprecated API endpoint called                                     │
│   │   • Cache miss (expected occasionally)                                 │
│   │   • Authentication failure (wrong password)                            │
│   └── Action: Review during business hours                                 │
│                                                                             │
│   🟢 INFO (20)                                                              │
│   ├── Normal operational events worth recording                            │
│   ├── Examples:                                                            │
│   │   • User logged in successfully                                        │
│   │   • Group created/updated/deleted                                      │
│   │   • Configuration changed                                              │
│   │   • Scheduled job completed                                            │
│   └── Action: None (for audit trail)                                       │
│                                                                             │
│   🔵 DEBUG (10)                                                             │
│   ├── Detailed information for debugging                                   │
│   ├── Examples:                                                            │
│   │   • SQL query executed                                                 │
│   │   • Cache hit/miss details                                             │
│   │   • Request/response payloads                                          │
│   │   • Function entry/exit with parameters                                │
│   └── Action: None (disabled in production)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Log Level Configuration

| Environment     | Min Level | CRITICAL | ERROR | WARNING | INFO | DEBUG |
| --------------- | --------- | -------- | ----- | ------- | ---- | ----- |
| **Production**  | INFO      | ✅        | ✅     | ✅       | ✅    | ❌     |
| **Staging**     | DEBUG     | ✅        | ✅     | ✅       | ✅    | ✅     |
| **Development** | DEBUG     | ✅        | ✅     | ✅       | ✅    | ✅     |

---

## 6. Request Correlation

### 6.1 Correlation ID Middleware

```python
# ============================================
# CORRELATION ID MIDDLEWARE (apps/api/src/middleware/correlation.py)
# ============================================
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import structlog
from contextvars import ContextVar
from uuid import uuid4

# Context variable for trace ID
_trace_id: ContextVar[str] = ContextVar("trace_id", default="")

def get_trace_id() -> str:
    """Get current request's trace ID"""
    return _trace_id.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle request correlation IDs for distributed tracing
    """
    
    HEADER_NAME = "X-Request-ID"
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Get trace ID from header or generate new one
        trace_id = request.headers.get(self.HEADER_NAME) or str(uuid4())
        
        # Store in context var for access anywhere in request lifecycle
        _trace_id.set(trace_id)
        
        # Bind trace_id to all logs in this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            trace_id=trace_id,
            path=request.url.path,
            method=request.method,
        )
        
        # Process request
        response = await call_next(request)
        
        # Add trace ID to response header
        response.headers[self.HEADER_NAME] = trace_id
        
        return response
```

### 6.2 Propagating Trace ID

```python
# All logs automatically include trace_id
logger.info("processing_request")  # trace_id included automatically

# When calling external services, pass trace_id
async def call_telegram_api(endpoint: str, data: dict) -> dict:
    trace_id = get_trace_id()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.telegram.org/bot{TOKEN}/{endpoint}",
            json=data,
            headers={"X-Request-ID": trace_id},  # Propagate trace ID
        )
    
    return response.json()
```

### 6.3 OpenTelemetry Integration (Optional)

```python
# ============================================
# OPENTELEMETRY SETUP (apps/api/src/core/telemetry.py)
# ============================================
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def setup_telemetry(app, service_name: str = "nezuko-admin-api") -> None:
    """Configure OpenTelemetry for distributed tracing"""
    
    # Set up tracer provider
    provider = TracerProvider()
    
    # Configure OTLP exporter (e.g., to Jaeger)
    otlp_exporter = OTLPSpanExporter(
        endpoint="http://jaeger:4317",
        insecure=True,
    )
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
```

---

## 7. Frontend Error Handling

### 7.1 Next.js Error Boundaries

```typescript
// ============================================
// GLOBAL ERROR BOUNDARY (apps/web/src/app/error.tsx)
// ============================================
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="text-sm text-muted-foreground">
            Error ID: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()}>Try Again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 7.2 Global Error Handler (Root Layout)

```typescript
// ============================================
// GLOBAL ERROR HANDLER (apps/web/src/app/global-error.tsx)
// ============================================
'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Critical Error</h2>
            <p className="text-muted-foreground">
              The application encountered a critical error.
            </p>
            <Button onClick={() => reset()}>Reload Application</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### 7.3 API Error Handling Hook

```typescript
// ============================================
// API ERROR HOOK (apps/web/src/lib/hooks/use-api-error.ts)
// ============================================
import { toast } from 'sonner';

interface APIError {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  trace_id?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export function useApiErrorHandler() {
  const handleError = (error: APIError | unknown) => {
    if (isAPIError(error)) {
      // Handle structured API errors
      switch (error.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Permission Denied', {
            description: error.detail,
          });
          break;
        case 422:
          // Validation errors - show field errors
          if (error.errors) {
            error.errors.forEach((e) => {
              toast.error(`${e.field}: ${e.message}`);
            });
          }
          break;
        case 429:
          toast.error('Rate Limited', {
            description: 'Please wait before trying again.',
          });
          break;
        default:
          toast.error(error.title, {
            description: error.detail,
          });
      }
      
      // Log for debugging
      console.error(`[${error.code}] ${error.title}: ${error.detail}`, {
        trace_id: error.trace_id,
      });
    } else {
      // Unknown error
      toast.error('An unexpected error occurred');
      console.error('Unknown error:', error);
    }
  };

  return { handleError };
}

function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'status' in error
  );
}
```

---

## 8. Log Rotation & Retention

### 8.1 Docker Logging Configuration

```yaml
# ============================================
# DOCKER COMPOSE LOGGING (docker/compose/docker-compose.prod.yml)
# ============================================
services:
  api:
    image: nezuko-api:latest
    logging:
      driver: "json-file"
      options:
        max-size: "50m"      # Max 50MB per log file
        max-file: "5"        # Keep 5 rotated files
        compress: "true"     # Compress rotated files
    # ...

  web:
    image: nezuko-web:latest
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"
    # ...

  postgres:
    image: postgres:18
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
    # ...
```

### 8.2 Retention Policy

| Log Type             | Retention | Storage | Reasoning                    |
| -------------------- | --------- | ------- | ---------------------------- |
| **Application Logs** | 30 days   | 500MB   | Debugging, incident response |
| **Access Logs**      | 90 days   | 1GB     | Security analysis, auditing  |
| **Audit Logs**       | 1 year    | 2GB     | Compliance (SOC 2, GDPR)     |
| **Error Logs**       | 90 days   | 500MB   | Bug tracking, postmortems    |
| **Security Logs**    | 1 year    | 500MB   | Forensics, compliance        |

### 8.3 Centralized Logging (Production)

```yaml
# ============================================
# LOKI + PROMTAIL STACK (optional)
# ============================================
services:
  loki:
    image: grafana/loki:3.4
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml

  promtail:
    image: grafana/promtail:3.4
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yaml
```

---

## 9. Error Recovery Strategies

### 9.1 Retry with Exponential Backoff

```python
# ============================================
# RETRY DECORATOR (apps/api/src/utils/retry.py)
# ============================================
import asyncio
from functools import wraps
from typing import TypeVar, Callable, Any
import structlog

logger = structlog.get_logger()
T = TypeVar("T")

def retry_async(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    exceptions: tuple = (Exception,),
):
    """
    Retry decorator with exponential backoff
    
    Usage:
        @retry_async(max_attempts=3, exceptions=(httpx.TimeoutException,))
        async def fetch_data():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts:
                        logger.error(
                            "retry_exhausted",
                            function=func.__name__,
                            attempts=attempt,
                            error=str(e),
                        )
                        raise
                    
                    # Calculate delay with exponential backoff + jitter
                    delay = min(
                        base_delay * (exponential_base ** (attempt - 1)),
                        max_delay
                    )
                    jitter = delay * 0.1 * (2 * asyncio.get_event_loop().time() % 1 - 1)
                    delay += jitter
                    
                    logger.warning(
                        "retry_attempt",
                        function=func.__name__,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        delay_seconds=delay,
                        error=str(e),
                    )
                    
                    await asyncio.sleep(delay)
            
            raise last_exception  # Should never reach here
        
        return wrapper
    return decorator
```

### 9.2 Circuit Breaker Pattern

```python
# ============================================
# CIRCUIT BREAKER (apps/api/src/utils/circuit_breaker.py)
# ============================================
import asyncio
from enum import Enum
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger()

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    """
    Circuit breaker to prevent cascading failures
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        success_threshold: int = 2,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: datetime | None = None
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        
        if self.state == CircuitState.OPEN:
            # Check if we should try half-open
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info("circuit_half_open", circuit=self.name)
            else:
                raise CircuitOpenError(f"Circuit '{self.name}' is open")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                logger.info("circuit_closed", circuit=self.name)
        else:
            self.failure_count = 0
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                "circuit_opened",
                circuit=self.name,
                failure_count=self.failure_count,
            )
    
    def _should_attempt_reset(self) -> bool:
        if self.last_failure_time is None:
            return True
        return datetime.now() > self.last_failure_time + timedelta(seconds=self.recovery_timeout)


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass


# Usage example
redis_circuit = CircuitBreaker("redis", failure_threshold=3, recovery_timeout=30)

async def get_cached_value(key: str) -> str | None:
    return await redis_circuit.call(redis_client.get, key)
```

### 9.3 Graceful Degradation

```python
# ============================================
# GRACEFUL DEGRADATION PATTERN
# ============================================
async def get_user_stats(user_id: str) -> UserStats:
    """
    Get user stats with graceful degradation
    """
    
    # Try cache first
    try:
        cached = await redis_circuit.call(
            cache.get, f"stats:{user_id}"
        )
        if cached:
            return UserStats.model_validate_json(cached)
    except (CircuitOpenError, RedisError) as e:
        logger.warning("cache_unavailable", error=str(e))
        # Continue without cache
    
    # Fall back to database
    try:
        stats = await db.fetch_user_stats(user_id)
        
        # Try to cache result (fire and forget)
        asyncio.create_task(
            cache_stats_safely(user_id, stats)
        )
        
        return stats
    except DatabaseError:
        # Return stale data or defaults
        logger.error("database_unavailable", user_id=user_id)
        return UserStats.default()


async def cache_stats_safely(user_id: str, stats: UserStats) -> None:
    """Cache without failing the main request"""
    try:
        await cache.set(f"stats:{user_id}", stats.model_dump_json(), ex=300)
    except Exception as e:
        logger.warning("cache_write_failed", error=str(e))
```

---

## 10. Quick Reference

### 10.1 Error Handling Checklist

- [ ] All endpoints return RFC 9457 Problem Details format
- [ ] Custom exceptions extend `AppException`
- [ ] Global exception handler registered
- [ ] Validation errors include field-level details
- [ ] 500 errors never expose internal details
- [ ] All errors include `trace_id` for debugging
- [ ] Structlog configured with JSON output (production)
- [ ] Log levels used appropriately
- [ ] Correlation ID middleware active
- [ ] Frontend error boundaries in place
- [ ] API error hook handles all error codes
- [ ] Docker log rotation configured
- [ ] Retry logic for external services
- [ ] Circuit breakers for external dependencies
- [ ] Graceful degradation implemented

### 10.2 Log Event Naming Convention

```
# Format: [action]_[result]
# Examples:
user_login_success
user_login_failure
group_created
group_creation_failed
cache_hit
cache_miss
database_query_executed
external_api_call_timeout
circuit_opened
retry_attempt
```

---

[← Back to API Design](./04-API-DESIGN.md) | [Back to Index](./README.md) | [Next: UI Wireframes →](./05-UI-WIREFRAMES.md)

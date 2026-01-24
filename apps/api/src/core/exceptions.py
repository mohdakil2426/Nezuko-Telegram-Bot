"""Global application exception definitions."""

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
    ) -> None:
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

    def __init__(self, detail: str = "Authentication failed") -> None:
        super().__init__(
            code="AUTH_001",
            title="Authentication Failed",
            detail=detail,
            status_code=401,
        )


class TokenExpiredError(AppException):
    """JWT token has expired"""

    def __init__(self) -> None:
        super().__init__(
            code="AUTH_002",
            title="Token Expired",
            detail="Your session has expired. Please login again.",
            status_code=401,
        )


class InsufficientPermissionsError(AppException):
    """User lacks required permissions"""

    def __init__(self, required_role: str = "admin") -> None:
        super().__init__(
            code="AUTH_003",
            title="Insufficient Permissions",
            detail=f"This action requires '{required_role}' role or higher.",
            status_code=403,
        )


# Resource Errors
class ResourceNotFoundError(AppException):
    """Requested resource does not exist"""

    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(
            code="RES_001",
            title="Resource Not Found",
            detail=f"{resource} with identifier '{identifier}' was not found.",
            status_code=404,
        )


class ResourceConflictError(AppException):
    """Resource already exists or conflict"""

    def __init__(self, detail: str) -> None:
        super().__init__(
            code="RES_002",
            title="Resource Conflict",
            detail=detail,
            status_code=409,
        )


# Validation Errors
class ValidationError(AppException):
    """Request body validation failed"""

    def __init__(self, errors: list[dict[str, Any]]) -> None:
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

    def __init__(self, retry_after: int = 60) -> None:
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

    def __init__(self, detail: str = "A database error occurred") -> None:
        super().__init__(
            code="DB_001",
            title="Database Error",
            detail=detail,
            status_code=500,
        )


# External Service Errors
class ExternalServiceError(AppException):
    """External service (Redis, Telegram) unavailable"""

    def __init__(self, service: str) -> None:
        super().__init__(
            code="EXT_001",
            title="External Service Error",
            detail=f"The {service} service is currently unavailable.",
            status_code=503,
        )

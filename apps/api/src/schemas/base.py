from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response wrapper."""

    status: str = "success"
    data: T
    meta: dict | None = None


class ErrorResponse(BaseModel):
    """Standard error response defined by RFC 9457."""

    status: str = "error"
    error: dict
    meta: dict | None = None

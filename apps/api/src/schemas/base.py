from typing import TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total_items: int
    total_pages: int


class SuccessResponse[T](BaseModel):
    """Standard success response wrapper."""

    status: str = "success"
    data: T
    meta: dict | None = None


class PaginatedResponse[T](BaseModel):
    """Paginated response wrapper."""

    status: str = "success"
    data: list[T]
    meta: PaginationMeta


class ErrorResponse(BaseModel):
    """Standard error response defined by RFC 9457."""

    status: str = "error"
    error: dict
    meta: dict | None = None

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .auth import UserResponse


class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    user: UserResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    per_page: int

"""Pydantic schemas for admin management."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.core.permissions import Role


class AdminBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: Role = Role.VIEWER
    telegram_id: int | None = None
    is_active: bool = True


class AdminCreateRequest(AdminBase):
    password: str = Field(min_length=8, description="Initial password")


class AdminUpdateRequest(BaseModel):
    full_name: str | None = None
    role: Role | None = None
    telegram_id: int | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8)


class AdminResponse(AdminBase):
    id: UUID
    created_at: datetime
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .base import BaseSchema


class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr
    password: str = Field(..., min_length=1)  # Strict validation handled in service/frontend

    model_config = ConfigDict(extra="forbid")


class RefreshRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseSchema):
    """User response schema."""

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    role: str
    created_at: datetime
    last_login: datetime | None


class AuthResponse(BaseModel):
    """Authentication response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshResponse(BaseModel):
    """Token refresh response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int

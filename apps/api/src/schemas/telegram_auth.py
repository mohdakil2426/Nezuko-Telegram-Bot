"""Pydantic schemas for Telegram authentication.

These schemas define the request/response formats for the Telegram Login Widget
authentication flow.
"""

from pydantic import BaseModel, ConfigDict, Field


class TelegramAuthRequest(BaseModel):
    """Request data from Telegram Login Widget.

    The Telegram Login Widget returns these fields when a user authenticates.
    The hash field is used to verify the authenticity of the data.
    """

    id: int = Field(..., description="User's Telegram ID")
    first_name: str = Field(..., description="User's first name")
    last_name: str | None = Field(None, description="User's last name")
    username: str | None = Field(None, description="User's @username")
    photo_url: str | None = Field(None, description="User's profile photo URL")
    auth_date: int = Field(..., description="Unix timestamp when auth occurred")
    hash: str = Field(..., description="HMAC-SHA256 hash for verification")


class TelegramAuthResponse(BaseModel):
    """Response after successful Telegram authentication."""

    success: bool = Field(..., description="Whether authentication was successful")
    message: str = Field(..., description="Human-readable status message")
    session_id: str | None = Field(None, description="Session ID (set as cookie)")
    user: "SessionUser | None" = Field(None, description="Authenticated user info")


class SessionUser(BaseModel):
    """Current authenticated user info from session.

    This is returned by /auth/me to display user info in the dashboard.
    """

    telegram_id: int = Field(..., description="User's Telegram ID")
    username: str | None = Field(None, description="User's @username")
    first_name: str = Field(..., description="User's first name")
    last_name: str | None = Field(None, description="User's last name")
    photo_url: str | None = Field(None, description="User's profile photo URL")

    model_config = ConfigDict(from_attributes=True)


class LogoutRequest(BaseModel):
    """Request to logout (clear session).

    Currently empty but allows for future fields like 'logout_all'.
    """

    logout_all: bool = Field(
        False,
        description="If True, clear all sessions for this user",
    )


class LogoutResponse(BaseModel):
    """Response after logout."""

    success: bool = Field(..., description="Whether logout was successful")
    message: str = Field(..., description="Human-readable status message")


# Update forward references
TelegramAuthResponse.model_rebuild()

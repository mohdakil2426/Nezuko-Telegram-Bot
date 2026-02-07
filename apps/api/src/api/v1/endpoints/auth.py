"""Authentication endpoints.

Provides endpoints for session management and user authentication status.
"""

import hashlib
import hmac
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import CurrentSession
from src.core.config import get_settings
from src.core.database import get_session
from src.models.session import Session
from src.schemas.base import SuccessResponse

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramAuthData(BaseModel):
    """Data received from Telegram Login Widget."""

    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class AuthResponse(BaseModel):
    """Response from /auth/telegram endpoint."""

    success: bool
    message: str
    session_id: str | None = None
    user: dict[str, Any] | None = None


def verify_telegram_auth(auth_data: TelegramAuthData, bot_token: str) -> bool:
    """Verify the Telegram Login Widget authentication data.

    Args:
        auth_data: Authentication data from Telegram widget.
        bot_token: The bot token used for login verification.

    Returns:
        True if the authentication is valid, False otherwise.
    """
    # Check if auth_date is not too old (within 24 hours)
    current_time = int(time.time())
    if current_time - auth_data.auth_date > 86400:
        return False

    # Build the data-check-string
    data_dict = auth_data.model_dump(exclude={"hash"})
    # Remove None values and sort alphabetically
    data_check_arr = [
        f"{key}={value}" for key, value in sorted(data_dict.items()) if value is not None
    ]
    data_check_string = "\n".join(data_check_arr)

    # Create secret key from bot token
    secret_key = hashlib.sha256(bot_token.encode()).digest()

    # Calculate HMAC-SHA256
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(calculated_hash, auth_data.hash)


@router.post("/telegram", response_model=AuthResponse)
async def telegram_login(
    auth_data: TelegramAuthData,
    response: Response,
    db: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Authenticate user via Telegram Login Widget.

    Verifies the Telegram authentication data and creates a session.
    Sets an HTTP-only cookie with the session ID.

    Args:
        auth_data: Authentication data from Telegram Login Widget.
        response: FastAPI response object for setting cookies.
        db: Database session.

    Returns:
        AuthResponse with success status and user info.

    Raises:
        HTTPException: If authentication fails or user is not authorized.
    """
    settings = get_settings()

    # In development mode with no bot token, allow mock auth
    if settings.ENVIRONMENT == "development" and not settings.LOGIN_BOT_TOKEN:
        # Create a mock session for development
        session = Session(
            telegram_id=auth_data.id,
            telegram_username=auth_data.username,
            telegram_name=f"{auth_data.first_name} {auth_data.last_name or ''}".strip(),
            telegram_photo_url=auth_data.photo_url,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Set session cookie
        response.set_cookie(
            key="session_id",
            value=session.id,
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax",
            max_age=settings.SESSION_EXPIRY_HOURS * 3600,
        )

        return AuthResponse(
            success=True,
            message="Login successful (development mode)",
            session_id=session.id,
            user={
                "telegram_id": session.telegram_id,
                "username": session.telegram_username,
                "first_name": auth_data.first_name,
                "last_name": auth_data.last_name,
                "photo_url": session.telegram_photo_url,
            },
        )

    # Production mode - verify Telegram authentication
    if not settings.LOGIN_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LOGIN_BOT_TOKEN not configured",
        )

    # Verify the Telegram authentication hash
    if not verify_telegram_auth(auth_data, settings.LOGIN_BOT_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication",
        )

    # Check if user is the bot owner (owner-only access)
    if settings.BOT_OWNER_TELEGRAM_ID and auth_data.id != settings.BOT_OWNER_TELEGRAM_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only the bot owner can access this dashboard.",
        )

    # Check for existing session
    stmt = select(Session).where(Session.telegram_id == auth_data.id)
    result = await db.execute(stmt)
    existing_session = result.scalar_one_or_none()

    if existing_session and not existing_session.is_expired():
        session = existing_session
    else:
        # Delete old session if exists
        if existing_session:
            await db.delete(existing_session)

        # Create new session
        session = Session(
            telegram_id=auth_data.id,
            telegram_username=auth_data.username,
            telegram_name=f"{auth_data.first_name} {auth_data.last_name or ''}".strip(),
            telegram_photo_url=auth_data.photo_url,
        )
        db.add(session)

    await db.commit()
    await db.refresh(session)

    # Set session cookie
    response.set_cookie(
        key="session_id",
        value=session.id,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.SESSION_EXPIRY_HOURS * 3600,
    )

    return AuthResponse(
        success=True,
        message="Login successful",
        session_id=session.id,
        user={
            "telegram_id": session.telegram_id,
            "username": session.telegram_username,
            "first_name": auth_data.first_name,
            "last_name": auth_data.last_name,
            "photo_url": session.telegram_photo_url,
        },
    )


@router.get("/me", response_model=SuccessResponse[dict[str, Any]])
async def get_current_user(session: CurrentSession) -> SuccessResponse[dict[str, Any]]:
    """Get the current authenticated user's session info.

    Returns the current user's session data including Telegram details.
    Used by the frontend to check authentication status.

    Args:
        session: Current authenticated session.

    Returns:
        ApiResponse with user session data.
    """
    return SuccessResponse(
        data={
            "id": session.id,
            "telegram_id": session.telegram_id,
            "telegram_username": session.telegram_username,
            "telegram_name": session.telegram_name,
            "telegram_photo_url": session.telegram_photo_url,
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
            "created_at": session.created_at.isoformat() if session.created_at else None,
        },
    )


@router.post("/logout", response_model=SuccessResponse[dict[str, Any]])
async def logout(session: CurrentSession) -> SuccessResponse[dict[str, Any]]:
    """Log out the current user.

    In dev mode, this is a no-op but returns success for API compatibility.

    Args:
        session: Current authenticated session.

    Returns:
        ApiResponse indicating logout success.
    """
    # In dev mode, just return success
    # In production, this would invalidate the session
    return SuccessResponse(
        data={"message": "Logged out successfully"},
    )

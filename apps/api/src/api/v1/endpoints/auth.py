"""Authentication endpoints (deprecated - use telegram_auth instead).

This module is kept for backward compatibility. New implementations should use:
    - /auth/telegram - Telegram Login Widget authentication
    - /auth/logout - Session logout
    - /auth/me - Current user info (from telegram_auth)

The endpoints in this file are deprecated and may be removed in a future version.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.v1.dependencies.session import get_current_session
from src.models.session import Session

router = APIRouter()


class DeprecatedUserResponse:
    """Minimal user response for backward compatibility."""

    def __init__(self, session: Session):
        self.id = session.telegram_id
        self.email = f"{session.telegram_username}@telegram.local"
        self.role = "super_admin"  # Owner has all permissions
        self.is_active = True
        self.username = session.telegram_username
        self.display_name = session.telegram_name


@router.get("/me", deprecated=True)
async def get_current_user_info(
    session: Session = Depends(get_current_session),
) -> dict:
    """
    Get current user info (DEPRECATED).

    This endpoint is deprecated. Use /auth/me from telegram_auth instead.
    """
    return {
        "success": True,
        "data": {
            "id": session.telegram_id,
            "email": f"{session.telegram_username}@telegram.local",
            "role": "super_admin",
            "is_active": True,
            "username": session.telegram_username,
            "display_name": session.telegram_name,
            "avatar_url": session.telegram_photo_url,
        },
    }


@router.post("/sync", deprecated=True)
async def sync_user() -> dict:
    """
    Sync user (DEPRECATED - no longer needed).

    This endpoint is deprecated. With Telegram Login Widget,
    user data is synced automatically during the auth flow.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use /auth/telegram for authentication.",
    )

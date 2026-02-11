"""Authentication endpoints — No login required.

Authentication has been removed. These endpoints exist for
UI compatibility only. The dashboard is open to anyone.
"""

from typing import Any

from fastapi import APIRouter

from src.api.v1.dependencies.session import CurrentOwner
from src.core.config import get_settings
from src.schemas.base import SuccessResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=SuccessResponse[dict[str, Any]])
async def get_current_user(owner: CurrentOwner) -> SuccessResponse[dict[str, Any]]:
    """Get the current owner's identity.

    No authentication required. Returns the owner identity
    configured via BOT_OWNER_TELEGRAM_ID environment variable.

    Args:
        owner: Owner identity from config.

    Returns:
        SuccessResponse with owner data.
    """
    settings = get_settings()
    return SuccessResponse(
        data={
            "telegram_id": owner.telegram_id,
            "telegram_username": "owner",
            "telegram_name": "Bot Owner",
            "telegram_photo_url": None,
            "expires_at": None,
            "created_at": None,
            "authenticated": bool(settings.BOT_OWNER_TELEGRAM_ID),
        },
    )


@router.post("/logout", response_model=SuccessResponse[dict[str, Any]])
async def logout() -> SuccessResponse[dict[str, Any]]:
    """No-op logout endpoint for UI compatibility.

    Returns:
        SuccessResponse indicating success.
    """
    return SuccessResponse(
        data={"message": "No authentication active"},
    )

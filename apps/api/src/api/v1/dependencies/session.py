"""Owner identity provider — no authentication required.

All endpoints are open. This dependency provides the owner's identity
from the environment configuration (BOT_OWNER_TELEGRAM_ID) for API
operations that need an owner reference (e.g., listing bots).

No login, no session cookies, no token validation.
"""

from typing import Annotated

from fastapi import Depends
from pydantic import BaseModel

from src.core.config import get_settings


class OwnerIdentity(BaseModel):
    """Lightweight owner identity for API endpoints.

    Attributes:
        telegram_id: The owner's Telegram user ID from config.
    """

    telegram_id: int


async def get_owner_identity() -> OwnerIdentity:
    """Provide the owner's identity from environment configuration.

    Returns:
        OwnerIdentity with telegram_id from BOT_OWNER_TELEGRAM_ID.
    """
    settings = get_settings()
    owner_id = settings.BOT_OWNER_TELEGRAM_ID or 0
    return OwnerIdentity(telegram_id=owner_id)


# Type alias for dependency injection in endpoints
CurrentOwner = Annotated[OwnerIdentity, Depends(get_owner_identity)]

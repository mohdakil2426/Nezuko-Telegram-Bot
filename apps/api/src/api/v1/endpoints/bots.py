"""Bot management API endpoints.

Allows the owner to add, view, update, and delete bot instances.
No authentication required — owner identity from environment config.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import CurrentOwner
from src.core.database import get_session
from src.schemas.bot_instance import (
    BotCreate,
    BotListResponse,
    BotResponse,
    BotUpdate,
    BotVerifyResponse,
)
from src.services.bot_instance_service import (
    BotInstanceService,
    BotNotFoundError,
    DuplicateBotError,
    EncryptionNotConfiguredError,
)
from src.services.telegram_api import InvalidTokenError, TelegramAPIError, telegram_api

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/bots", tags=["Bot Management"])


async def get_bot_service(
    db: AsyncSession = Depends(get_session),
) -> BotInstanceService:
    """FastAPI dependency for BotInstanceService.

    Args:
        db: Database session.

    Returns:
        Configured BotInstanceService instance.
    """
    return BotInstanceService(db)


BotService = Depends(get_bot_service)


@router.get("", response_model=BotListResponse)
async def list_bots(
    owner: CurrentOwner,
    service: BotInstanceService = BotService,
) -> BotListResponse:
    """List all bots for the owner.

    Args:
        owner: Owner identity from config.
        service: Bot instance service.

    Returns:
        BotListResponse with list of bots.
    """
    bots = await service.list_bots(owner.telegram_id)

    return BotListResponse(
        bots=[service.to_response(bot) for bot in bots],
        total=len(bots),
    )


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def add_bot(
    bot_data: BotCreate,
    owner: CurrentOwner,
    service: BotInstanceService = BotService,
) -> BotResponse:
    """Add a new bot.

    The token is verified with Telegram and encrypted before storage.

    Args:
        bot_data: Bot creation data with token.
        owner: Owner identity from config.
        service: Bot instance service.

    Returns:
        Created BotResponse.

    Raises:
        HTTPException: 400 for invalid token, 409 for duplicate.
    """
    try:
        bot = await service.add_bot(owner.telegram_id, bot_data)
        return service.to_response(bot)

    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot token. Please check and try again.",
        ) from exc
    except DuplicateBotError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except EncryptionNotConfiguredError as exc:
        logger.error("Encryption not configured when adding bot")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error. Please contact support.",
        ) from exc
    except TelegramAPIError as exc:
        logger.error("telegram_api_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify bot with Telegram. Please try again.",
        ) from exc


@router.post("/verify", response_model=BotVerifyResponse)
async def verify_bot_token(
    bot_data: BotCreate,
) -> BotVerifyResponse:
    """Verify a bot token without saving it.

    Used for the "Verify & Add" flow in the UI.

    Args:
        bot_data: Bot data with token.

    Returns:
        BotVerifyResponse with bot info.
    """
    try:
        bot_info = await telegram_api.get_bot_info(bot_data.token)
        return BotVerifyResponse(
            bot_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            is_valid=True,
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot token. Please check and try again.",
        ) from exc
    except TelegramAPIError as exc:
        logger.error("telegram_api_error_during_verify", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify bot with Telegram. Please try again.",
        ) from exc


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: int,
    owner: CurrentOwner,
    service: BotInstanceService = BotService,
) -> BotResponse:
    """Get a single bot by ID.

    Args:
        bot_id: Internal bot instance ID.
        owner: Owner identity from config.
        service: Bot instance service.

    Returns:
        BotResponse.
    """
    try:
        bot = await service.get_bot(owner.telegram_id, bot_id)
        return service.to_response(bot)
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        ) from exc


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    update_data: BotUpdate,
    owner: CurrentOwner,
    service: BotInstanceService = BotService,
) -> BotResponse:
    """Update a bot's status.

    Args:
        bot_id: Internal bot instance ID.
        update_data: Update data (is_active toggle).
        owner: Owner identity from config.
        service: Bot instance service.

    Returns:
        Updated BotResponse.
    """
    try:
        bot = await service.update_bot(owner.telegram_id, bot_id, update_data)
        return service.to_response(bot)
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        ) from exc


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(
    bot_id: int,
    owner: CurrentOwner,
    service: BotInstanceService = BotService,
) -> None:
    """Delete a bot.

    This will also unlink any associated groups.

    Args:
        bot_id: Internal bot instance ID.
        owner: Owner identity from config.
        service: Bot instance service.
    """
    try:
        await service.delete_bot(owner.telegram_id, bot_id)
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        ) from exc

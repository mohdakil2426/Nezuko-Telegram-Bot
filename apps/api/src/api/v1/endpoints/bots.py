"""Bot management API endpoints.

Allows the owner to add, view, update, and delete bot instances.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import CurrentSession
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bots", tags=["Bot Management"])


@router.get("", response_model=BotListResponse)
async def list_bots(
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> BotListResponse:
    """List all bots for the authenticated owner.

    Args:
        session: Current authenticated session.
        db: Database session.

    Returns:
        BotListResponse with list of bots.
    """
    service = BotInstanceService(db)
    bots = await service.list_bots(session.telegram_id)

    return BotListResponse(
        bots=[service.to_response(bot) for bot in bots],
        total=len(bots),
    )


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def add_bot(
    bot_data: BotCreate,
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> BotResponse:
    """Add a new bot.

    The token is verified with Telegram and encrypted before storage.

    Args:
        bot_data: Bot creation data with token.
        session: Current authenticated session.
        db: Database session.

    Returns:
        Created BotResponse.

    Raises:
        HTTPException: 400 for invalid token, 409 for duplicate.
    """
    service = BotInstanceService(db)

    try:
        bot = await service.add_bot(session.telegram_id, bot_data)
        return service.to_response(bot)

    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot token. Please check and try again.",
        )
    except DuplicateBotError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    except EncryptionNotConfiguredError:
        logger.error("Encryption not configured when adding bot")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error. Please contact support.",
        )
    except TelegramAPIError as exc:
        logger.error("Telegram API error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify bot with Telegram. Please try again.",
        )


@router.post("/verify", response_model=BotVerifyResponse)
async def verify_bot_token(
    bot_data: BotCreate,
    session: CurrentSession,  # Require authentication
) -> BotVerifyResponse:
    """Verify a bot token without saving it.

    Used for the "Verify & Add" flow in the UI.

    Args:
        bot_data: Bot data with token.
        session: Current authenticated session.

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
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot token. Please check and try again.",
        )
    except TelegramAPIError as exc:
        logger.error("Telegram API error during verify: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify bot with Telegram. Please try again.",
        )


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: int,
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> BotResponse:
    """Get a single bot by ID.

    Args:
        bot_id: Internal bot instance ID.
        session: Current authenticated session.
        db: Database session.

    Returns:
        BotResponse.
    """
    service = BotInstanceService(db)

    try:
        bot = await service.get_bot(session.telegram_id, bot_id)
        return service.to_response(bot)
    except BotNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        )


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    update_data: BotUpdate,
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> BotResponse:
    """Update a bot's status.

    Args:
        bot_id: Internal bot instance ID.
        update_data: Update data (is_active toggle).
        session: Current authenticated session.
        db: Database session.

    Returns:
        Updated BotResponse.
    """
    service = BotInstanceService(db)

    try:
        bot = await service.update_bot(session.telegram_id, bot_id, update_data)
        return service.to_response(bot)
    except BotNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        )


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(
    bot_id: int,
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> None:
    """Delete a bot.

    This will also unlink any associated groups.

    Args:
        bot_id: Internal bot instance ID.
        session: Current authenticated session.
        db: Database session.
    """
    service = BotInstanceService(db)

    try:
        await service.delete_bot(session.telegram_id, bot_id)
    except BotNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found",
        )

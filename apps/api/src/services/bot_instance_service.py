"""Bot instance management service.

Handles CRUD operations for bot instances with token encryption.
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.encryption import decrypt_token, encrypt_token, is_encryption_configured
from src.core.events import (
    publish_activity,
    publish_bot_added,
    publish_bot_removed,
    publish_bot_status,
)
from src.models.bot_instance import BotInstance
from src.schemas.bot_instance import BotCreate, BotResponse, BotUpdate
from src.services.telegram_api import TelegramAPIService, telegram_api

logger = logging.getLogger(__name__)

# Store background tasks to prevent garbage collection (RUF006)
_background_tasks: set[asyncio.Task[None]] = set()


class BotServiceError(Exception):
    """Base exception for bot service errors."""


class DuplicateBotError(BotServiceError):
    """Raised when trying to add a bot that already exists."""


class BotNotFoundError(BotServiceError):
    """Raised when a bot is not found."""


class EncryptionNotConfiguredError(BotServiceError):
    """Raised when encryption is not configured."""


class BotInstanceService:
    """Service for managing bot instances.

    All bot tokens are encrypted at rest using Fernet.
    """

    def __init__(
        self,
        session: AsyncSession,
        telegram_service: TelegramAPIService | None = None,
    ) -> None:
        """Initialize with database session.

        Args:
            session: SQLAlchemy async session.
            telegram_service: Telegram API service (uses default if None).
        """
        self.session = session
        self.telegram_service = telegram_service or telegram_api

    @staticmethod
    def _publish_event_async(coro_func: object, *args: object) -> None:
        """Fire-and-forget event publishing.

        Creates a background task for the coroutine without blocking.
        Task is stored to prevent garbage collection (RUF006).
        """
        # Create coroutine based on callable
        coro = coro_func(*args)  # type: ignore[operator]
        task = asyncio.create_task(coro)
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    async def add_bot(self, owner_telegram_id: int, bot_data: BotCreate) -> BotInstance:
        """Add a new bot for the owner.

        1. Verifies the token with Telegram
        2. Checks for duplicates
        3. Encrypts the token
        4. Saves to database

        Args:
            owner_telegram_id: Owner's Telegram ID.
            bot_data: Bot creation data with token.

        Returns:
            Created BotInstance.

        Raises:
            InvalidTokenError: If token is invalid.
            DuplicateBotError: If bot already exists.
            EncryptionNotConfiguredError: If encryption is not configured.
        """
        # Check encryption is configured
        if not is_encryption_configured():
            raise EncryptionNotConfiguredError("ENCRYPTION_KEY is not configured")

        # Verify token with Telegram
        bot_info = await self.telegram_service.get_bot_info(bot_data.token)

        # Check for duplicate
        existing = await self._get_by_bot_id(bot_info.id)
        if existing:
            raise DuplicateBotError(f"Bot @{bot_info.username} has already been added")

        # Encrypt token
        encrypted_token = encrypt_token(bot_data.token)

        # Create bot instance
        bot = BotInstance(
            owner_telegram_id=owner_telegram_id,
            bot_id=bot_info.id,
            bot_username=bot_info.username,
            bot_name=bot_info.first_name,
            token_encrypted=encrypted_token,
            is_active=True,
        )

        self.session.add(bot)
        await self.session.commit()
        await self.session.refresh(bot)

        logger.info(
            "Bot added: @%s (id=%d) for owner %d",
            bot.bot_username,
            bot.bot_id,
            owner_telegram_id,
        )

        # Publish events (fire and forget)
        self._publish_event_async(
            publish_bot_added, bot.bot_id, bot.bot_username, owner_telegram_id
        )
        self._publish_event_async(publish_activity, "bot_added", {"bot_username": bot.bot_username})

        return bot

    async def list_bots(self, owner_telegram_id: int) -> list[BotInstance]:
        """List all bots for the owner.

        Args:
            owner_telegram_id: Owner's Telegram ID.

        Returns:
            List of BotInstance objects (ordered by created_at desc).
        """
        stmt = (
            select(BotInstance)
            .where(BotInstance.owner_telegram_id == owner_telegram_id)
            .order_by(BotInstance.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_bot(self, owner_telegram_id: int, bot_id: int) -> BotInstance:
        """Get a single bot by ID.

        Args:
            owner_telegram_id: Owner's Telegram ID.
            bot_id: Internal bot instance ID.

        Returns:
            BotInstance.

        Raises:
            BotNotFoundError: If bot not found or doesn't belong to owner.
        """
        stmt = select(BotInstance).where(
            BotInstance.id == bot_id,
            BotInstance.owner_telegram_id == owner_telegram_id,
        )
        result = await self.session.execute(stmt)
        bot = result.scalar_one_or_none()

        if not bot:
            raise BotNotFoundError(f"Bot with ID {bot_id} not found")

        return bot

    async def update_bot(
        self, owner_telegram_id: int, bot_id: int, update_data: BotUpdate
    ) -> BotInstance:
        """Update a bot's status.

        Args:
            owner_telegram_id: Owner's Telegram ID.
            bot_id: Internal bot instance ID.
            update_data: Update data (currently just is_active).

        Returns:
            Updated BotInstance.

        Raises:
            BotNotFoundError: If bot not found.
        """
        bot = await self.get_bot(owner_telegram_id, bot_id)

        bot.is_active = update_data.is_active
        await self.session.commit()
        await self.session.refresh(bot)

        logger.info(
            "Bot updated: @%s is_active=%s",
            bot.bot_username,
            bot.is_active,
        )

        # Publish status change event
        status = "activated" if bot.is_active else "deactivated"
        self._publish_event_async(
            publish_bot_status, bot.bot_id, bot.bot_username, status, bot.is_active
        )
        self._publish_event_async(
            publish_activity, f"bot_{status}", {"bot_username": bot.bot_username}
        )

        return bot

    async def delete_bot(self, owner_telegram_id: int, bot_id: int) -> bool:
        """Delete a bot.

        Args:
            owner_telegram_id: Owner's Telegram ID.
            bot_id: Internal bot instance ID.

        Returns:
            True if deleted.

        Raises:
            BotNotFoundError: If bot not found.
        """
        bot = await self.get_bot(owner_telegram_id, bot_id)

        # Store bot info before deletion for events
        bot_username = bot.bot_username
        telegram_bot_id = bot.bot_id

        # TODO: Unlink any associated groups
        # This will be implemented when group management is added

        await self.session.delete(bot)
        await self.session.commit()

        logger.info("Bot deleted: @%s (id=%d)", bot_username, telegram_bot_id)

        # Publish events
        self._publish_event_async(
            publish_bot_removed, telegram_bot_id, bot_username, owner_telegram_id
        )
        self._publish_event_async(publish_activity, "bot_removed", {"bot_username": bot_username})

        return True

    async def get_decrypted_token(self, owner_telegram_id: int, bot_id: int) -> str:
        """Get the decrypted bot token (for internal use only).

        This should only be used when making API calls on behalf of the bot.
        NEVER expose this in API responses.

        Args:
            owner_telegram_id: Owner's Telegram ID.
            bot_id: Internal bot instance ID.

        Returns:
            Decrypted bot token.
        """
        bot = await self.get_bot(owner_telegram_id, bot_id)
        return decrypt_token(bot.token_encrypted)

    async def _get_by_bot_id(self, telegram_bot_id: int) -> BotInstance | None:
        """Get bot by Telegram bot ID (for duplicate checking)."""
        stmt = select(BotInstance).where(BotInstance.bot_id == telegram_bot_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def to_response(self, bot: BotInstance) -> BotResponse:
        """Convert BotInstance to BotResponse schema.

        Args:
            bot: BotInstance model.

        Returns:
            BotResponse schema (without token).
        """
        return BotResponse(
            id=bot.id,
            bot_id=bot.bot_id,
            bot_username=bot.bot_username,
            bot_name=bot.bot_name,
            is_active=bot.is_active,
            created_at=bot.created_at,
            updated_at=bot.updated_at,
        )

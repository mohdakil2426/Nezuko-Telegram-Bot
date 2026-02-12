"""Unit tests for bot_instance_service.py.

Tests CRUD operations for bot instances with token encryption.
"""

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add apps/api to path
_project_root = Path(__file__).resolve().parent.parent.parent.parent
_api_path = _project_root / "apps" / "api"
if str(_api_path) not in sys.path:
    sys.path.insert(0, str(_api_path))

# Set test environment
os.environ["ENCRYPTION_KEY"] = "5N9sK8JzqL3mQ2vR7xW1yT4pF6hA0bC8dE9gI2kM5nO="
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from src.core.config import get_settings  # noqa: E402
from src.core.encryption import get_fernet  # noqa: E402
from src.models import Base  # noqa: E402
from src.schemas.bot_instance import BotCreate, BotUpdate, TelegramBotInfo  # noqa: E402
from src.services.bot_instance_service import (  # noqa: E402
    BotInstanceService,
    BotNotFoundError,
    DuplicateBotError,
    EncryptionNotConfiguredError,
)
from src.services.telegram_api import InvalidTokenError  # noqa: E402


# Clear caches before tests to ensure env vars are picked up
@pytest.fixture(autouse=True)
def clear_caches():
    """Clear settings and encryption caches before each test."""
    # Clear caches so env vars are picked up fresh
    get_settings.cache_clear()
    get_fernet.cache_clear()
    yield
    # Clean up after test
    get_settings.cache_clear()
    get_fernet.cache_clear()


# Test fixtures
@pytest.fixture
async def db_session() -> AsyncSession:
    """Create an in-memory database session for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session
        await session.rollback()

    await engine.dispose()


@pytest.fixture
def mock_telegram_service() -> AsyncMock:
    """Create a mock Telegram API service."""
    service = AsyncMock()
    service.get_bot_info = AsyncMock()
    return service


@pytest.fixture
def bot_service(db_session: AsyncSession, mock_telegram_service: AsyncMock) -> BotInstanceService:
    """Create a bot service with mock dependencies."""
    return BotInstanceService(session=db_session, telegram_service=mock_telegram_service)


@pytest.fixture
def sample_bot_info() -> TelegramBotInfo:
    """Create sample bot info for testing."""
    return TelegramBotInfo(
        id=123456789,
        is_bot=True,
        first_name="Test Bot",
        username="test_bot",
        can_join_groups=True,
        can_read_all_group_messages=False,
        supports_inline_queries=False,
    )


class TestAddBot:
    """Tests for adding a new bot."""

    @pytest.mark.asyncio
    async def test_add_bot_success(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test successfully adding a new bot."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        owner_id = 987654321
        token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

        # Act
        bot = await bot_service.add_bot(owner_id, BotCreate(token=token))

        # Assert
        assert bot is not None
        assert bot.owner_telegram_id == owner_id
        assert bot.bot_id == sample_bot_info.id
        assert bot.bot_username == sample_bot_info.username
        assert bot.bot_name == sample_bot_info.first_name
        assert bot.is_active is True
        assert bot.token_encrypted is not None
        mock_telegram_service.get_bot_info.assert_called_once_with(token)

    @pytest.mark.asyncio
    async def test_add_bot_invalid_token(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
    ):
        """Test adding a bot with invalid token raises error."""
        # Arrange
        mock_telegram_service.get_bot_info.side_effect = InvalidTokenError("Invalid bot token")

        # Act & Assert
        with pytest.raises(InvalidTokenError, match="Invalid bot token"):
            await bot_service.add_bot(
                123, BotCreate(token="invalid_token_that_fails_telegram_validation")
            )

    @pytest.mark.asyncio
    async def test_add_duplicate_bot(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
        db_session: AsyncSession,
    ):
        """Test adding a duplicate bot raises DuplicateBotError."""
        # Arrange - Add first bot
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        await bot_service.add_bot(
            123, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi1")
        )

        # Act & Assert - Try to add same bot again
        with pytest.raises(DuplicateBotError, match="has already been added"):
            await bot_service.add_bot(
                456, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi2")
            )

    @pytest.mark.asyncio
    async def test_add_bot_encryption_not_configured(
        self,
        db_session: AsyncSession,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test adding a bot without encryption configured."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info

        with patch(
            "src.services.bot_instance_service.is_encryption_configured", return_value=False
        ):
            service = BotInstanceService(session=db_session, telegram_service=mock_telegram_service)

            # Act & Assert
            with pytest.raises(
                EncryptionNotConfiguredError, match="ENCRYPTION_KEY is not configured"
            ):
                await service.add_bot(
                    123, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
                )


class TestListBots:
    """Tests for listing bots."""

    @pytest.mark.asyncio
    async def test_list_bots_empty(self, bot_service: BotInstanceService):
        """Test listing bots when none exist."""
        # Act
        bots = await bot_service.list_bots(123)

        # Assert
        assert bots == []

    @pytest.mark.asyncio
    async def test_list_bots_returns_owner_bots_only(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
    ):
        """Test that list_bots returns only bots for the specified owner."""
        # Arrange - Add bots for different owners
        owner1 = 111
        owner2 = 222

        mock_telegram_service.get_bot_info.side_effect = [
            TelegramBotInfo(id=1, is_bot=True, first_name="Bot1", username="bot1"),
            TelegramBotInfo(id=2, is_bot=True, first_name="Bot2", username="bot2"),
            TelegramBotInfo(id=3, is_bot=True, first_name="Bot3", username="bot3"),
        ]

        await bot_service.add_bot(
            owner1, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi1")
        )
        await bot_service.add_bot(
            owner2, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi2")
        )
        await bot_service.add_bot(
            owner1, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi3")
        )

        # Act
        owner1_bots = await bot_service.list_bots(owner1)
        owner2_bots = await bot_service.list_bots(owner2)

        # Assert
        assert len(owner1_bots) == 2
        assert len(owner2_bots) == 1
        assert all(bot.owner_telegram_id == owner1 for bot in owner1_bots)
        assert all(bot.owner_telegram_id == owner2 for bot in owner2_bots)


class TestGetBot:
    """Tests for getting a single bot."""

    @pytest.mark.asyncio
    async def test_get_bot_success(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test successfully getting a bot."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        owner_id = 123
        added_bot = await bot_service.add_bot(
            owner_id, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
        )

        # Act
        bot = await bot_service.get_bot(owner_id, added_bot.id)

        # Assert
        assert bot.id == added_bot.id
        assert bot.bot_username == sample_bot_info.username

    @pytest.mark.asyncio
    async def test_get_bot_not_found(self, bot_service: BotInstanceService):
        """Test getting a non-existent bot raises error."""
        # Act & Assert
        with pytest.raises(BotNotFoundError, match="not found"):
            await bot_service.get_bot(123, 999)

    @pytest.mark.asyncio
    async def test_get_bot_wrong_owner(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test getting a bot with wrong owner raises error."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        added_bot = await bot_service.add_bot(
            123, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
        )

        # Act & Assert - Try to get with different owner
        with pytest.raises(BotNotFoundError):
            await bot_service.get_bot(456, added_bot.id)


class TestUpdateBot:
    """Tests for updating a bot."""

    @pytest.mark.asyncio
    async def test_update_bot_toggle_active(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test toggling bot active status."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        owner_id = 123
        added_bot = await bot_service.add_bot(
            owner_id, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
        )
        assert added_bot.is_active is True

        # Act - Deactivate
        updated_bot = await bot_service.update_bot(
            owner_id, added_bot.id, BotUpdate(is_active=False)
        )

        # Assert
        assert updated_bot.is_active is False

        # Act - Reactivate
        reactivated_bot = await bot_service.update_bot(
            owner_id, added_bot.id, BotUpdate(is_active=True)
        )

        # Assert
        assert reactivated_bot.is_active is True

    @pytest.mark.asyncio
    async def test_update_bot_not_found(self, bot_service: BotInstanceService):
        """Test updating a non-existent bot raises error."""
        # Act & Assert
        with pytest.raises(BotNotFoundError):
            await bot_service.update_bot(123, 999, BotUpdate(is_active=False))


class TestDeleteBot:
    """Tests for deleting a bot."""

    @pytest.mark.asyncio
    async def test_delete_bot_success(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test successfully deleting a bot."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        owner_id = 123
        added_bot = await bot_service.add_bot(
            owner_id, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
        )

        # Act
        result = await bot_service.delete_bot(owner_id, added_bot.id)

        # Assert
        assert result is True

        # Verify bot is deleted
        with pytest.raises(BotNotFoundError):
            await bot_service.get_bot(owner_id, added_bot.id)

    @pytest.mark.asyncio
    async def test_delete_bot_not_found(self, bot_service: BotInstanceService):
        """Test deleting a non-existent bot raises error."""
        # Act & Assert
        with pytest.raises(BotNotFoundError):
            await bot_service.delete_bot(123, 999)

    @pytest.mark.asyncio
    async def test_delete_bot_wrong_owner(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test deleting a bot with wrong owner raises error."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        added_bot = await bot_service.add_bot(
            123, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890a")
        )

        # Act & Assert - Try to delete with different owner
        with pytest.raises(BotNotFoundError):
            await bot_service.delete_bot(456, added_bot.id)


class TestGetDecryptedToken:
    """Tests for token decryption."""

    @pytest.mark.asyncio
    async def test_get_decrypted_token_success(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test getting decrypted token."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        owner_id = 123
        original_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        added_bot = await bot_service.add_bot(owner_id, BotCreate(token=original_token))

        # Act
        decrypted_token = await bot_service.get_decrypted_token(owner_id, added_bot.id)

        # Assert
        assert decrypted_token == original_token


class TestToResponse:
    """Tests for response schema conversion."""

    @pytest.mark.asyncio
    async def test_to_response_excludes_token(
        self,
        bot_service: BotInstanceService,
        mock_telegram_service: AsyncMock,
        sample_bot_info: TelegramBotInfo,
    ):
        """Test that to_response does not expose token."""
        # Arrange
        mock_telegram_service.get_bot_info.return_value = sample_bot_info
        added_bot = await bot_service.add_bot(
            123, BotCreate(token="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
        )

        # Act
        response = bot_service.to_response(added_bot)

        # Assert
        assert response.id == added_bot.id
        assert response.bot_id == added_bot.bot_id
        assert response.bot_username == added_bot.bot_username
        assert response.bot_name == added_bot.bot_name
        assert response.is_active == added_bot.is_active
        # Verify token is not exposed
        assert not hasattr(response, "token")
        assert not hasattr(response, "token_encrypted")

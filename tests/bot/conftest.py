"""
Bot-specific test fixtures.

These fixtures are for testing the Telegram bot handlers and services.
They provide mock Telegram contexts and bot-specific database sessions.
"""

from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram.constants import ChatMemberStatus


@dataclass
class MockChannel:
    """Mock channel object implementing HasChannelId protocol."""

    channel_id: int | str
    title: str = "Test Channel"
    username: str | None = None
    invite_link: str | None = None


@pytest.fixture
def mock_channels() -> list[MockChannel]:
    """Provide a list of mock channels for testing."""
    return [
        MockChannel(channel_id=-1001111111111, title="Channel 1", username="channel1"),
        MockChannel(channel_id=-1002222222222, title="Channel 2", username="channel2"),
        MockChannel(channel_id="@channel3", title="Channel 3", username="channel3"),
    ]


@pytest.fixture
def mock_telegram_bot(mocker) -> AsyncMock:
    """Provide a mock Telegram bot instance."""
    bot = mocker.AsyncMock()

    # Mock get_chat_member to return a member by default
    member = mocker.MagicMock()
    member.status = ChatMemberStatus.MEMBER
    bot.get_chat_member = mocker.AsyncMock(return_value=member)

    # Mock restrict_chat_member
    bot.restrict_chat_member = mocker.AsyncMock(return_value=True)

    # Mock send_message
    bot.send_message = mocker.AsyncMock()

    return bot


@pytest.fixture
def mock_context(mock_telegram_bot) -> MagicMock:
    """Provide a mock Telegram context with bot attached."""
    context = MagicMock()
    context.bot = mock_telegram_bot
    return context


@pytest.fixture
def mock_update_with_new_member(mocker) -> MagicMock:
    """Provide a mock update for new member join events."""
    update = mocker.MagicMock()

    # Mock effective_chat
    update.effective_chat = mocker.MagicMock()
    update.effective_chat.id = -1001234567890

    # Mock message with new_chat_members
    update.message = mocker.MagicMock()
    new_member = mocker.MagicMock()
    new_member.id = 12345
    new_member.username = "newuser"
    new_member.is_bot = False
    update.message.new_chat_members = [new_member]

    return update


@pytest.fixture
def mock_redis_client(mocker) -> AsyncMock:
    """Provide a mock Redis client."""
    client = mocker.AsyncMock()
    client.get = mocker.AsyncMock(return_value=None)
    client.set = mocker.AsyncMock(return_value=True)
    client.delete = mocker.AsyncMock(return_value=1)
    client.ping = mocker.AsyncMock(return_value=True)
    return client

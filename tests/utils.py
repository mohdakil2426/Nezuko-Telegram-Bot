"""
Shared test utilities for Nezuko bot tests.

Provides mock Telegram Update and Context factories used across all test modules.
"""

from unittest.mock import AsyncMock, MagicMock

from telegram.constants import ChatMemberStatus


def create_mock_update(
    chat_type: str = "supergroup",
    text: str = "/start",
    user_id: int = 111222333,
    is_bot: bool = False,
) -> MagicMock:
    """
    Create a fully-configured mock Telegram Update object.

    Args:
        chat_type: Chat type string (private, group, supergroup, channel)
        text: Message text
        user_id: Telegram user ID
        is_bot: Whether the sender is a bot

    Returns:
        Configured MagicMock mimicking telegram.Update
    """
    update = MagicMock()

    # Effective user
    update.effective_user = MagicMock()
    update.effective_user.id = user_id
    update.effective_user.is_bot = is_bot
    update.effective_user.username = "testuser"
    update.effective_user.mention_html = MagicMock(return_value="<a>TestUser</a>")

    # Effective chat
    update.effective_chat = MagicMock()
    update.effective_chat.id = -1001234567890
    update.effective_chat.type = chat_type
    update.effective_chat.title = "Test Group"

    # Message
    update.message = MagicMock()
    update.message.text = text
    update.message.chat = update.effective_chat
    update.message.chat_id = update.effective_chat.id
    update.message.from_user = update.effective_user
    update.message.message_id = 42
    update.message.reply_text = AsyncMock()
    update.message.delete = AsyncMock()
    update.message.new_chat_members = []

    return update


def create_mock_context(
    user_status: ChatMemberStatus = ChatMemberStatus.MEMBER,
) -> MagicMock:
    """
    Create a fully-configured mock Telegram CallbackContext object.

    Args:
        user_status: The ChatMemberStatus to return from get_chat_member

    Returns:
        Configured MagicMock mimicking telegram.ext.CallbackContext
    """
    context = MagicMock()
    context.args = []

    # Bot with pre-configured async methods
    context.bot = MagicMock()

    member = MagicMock()
    member.status = user_status

    context.bot.get_chat_member = AsyncMock(return_value=member)
    context.bot.restrict_chat_member = AsyncMock(return_value=True)
    context.bot.send_message = AsyncMock()
    context.bot.get_chat = AsyncMock()

    return context


__all__ = ["create_mock_context", "create_mock_update"]

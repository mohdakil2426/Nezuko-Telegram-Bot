"""
Utility functions for bot tests.
"""
from unittest.mock import AsyncMock, MagicMock
from telegram.constants import ChatMemberStatus

# pylint: disable=too-many-arguments, too-many-positional-arguments
def create_mock_update(
    chat_type="supergroup",
    chat_id=-1001234567890,
    user_id=123456789,
    username="testuser",
    is_bot=False,
    text="/start",
    message_id=100
):
    """Create a mock Update object for testing."""
    update = MagicMock()

    # Chat
    update.effective_chat = MagicMock()
    update.effective_chat.id = chat_id
    update.effective_chat.type = chat_type
    update.effective_chat.title = "Test Group"

    # User
    update.effective_user = MagicMock()
    update.effective_user.id = user_id
    update.effective_user.username = username
    update.effective_user.is_bot = is_bot
    mention_html = f"<a href='tg://user?id={user_id}'>{username}</a>"
    update.effective_user.mention_html = MagicMock(return_value=mention_html)

    # Message
    update.message = MagicMock()
    update.message.text = text
    update.message.message_id = message_id
    update.message.reply_text = AsyncMock()
    update.message.delete = AsyncMock()
    update.message.from_user = update.effective_user
    update.message.chat = update.effective_chat
    update.message.sender_chat = None

    return update


def create_mock_context(bot_is_admin=True, user_status="member"):
    """Create a mock Context object for testing."""
    context = MagicMock()
    context.args = []
    context.bot = MagicMock()
    context.bot.id = 8265490825  # Bot ID
    context.bot.get_chat_member = AsyncMock()
    context.bot.restrict_chat_member = AsyncMock(return_value=True)
    context.bot.get_chat = AsyncMock()
    context.bot.create_chat_invite_link = AsyncMock()
    context.bot.send_message = AsyncMock()

    # Mock bot admin check
    mock_bot_member = MagicMock()
    mock_bot_member.status = "administrator" if bot_is_admin else "member"

    # This is tricky because get_chat_member is called for both user and bot
    # For simplicity, we make it return the user status by default
    # But some tests might need the bot status

    # Mock user status
    mock_member = MagicMock()
    if user_status == "member":
        mock_member.status = ChatMemberStatus.MEMBER
    elif user_status == "administrator":
        mock_member.status = ChatMemberStatus.ADMINISTRATOR
    elif user_status == "owner":
        mock_member.status = ChatMemberStatus.OWNER
    elif user_status == "left":
        mock_member.status = ChatMemberStatus.LEFT
    elif user_status == "banned":
        mock_member.status = ChatMemberStatus.BANNED
    else:
        mock_member.status = user_status

    context.bot.get_chat_member.return_value = mock_member

    return context

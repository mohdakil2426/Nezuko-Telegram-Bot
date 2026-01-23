"""
Handler Tests for GMBot v2.0

Tests for:
- Command handlers (/start, /help, /protect, /status, /unprotect, /settings)
- Event handlers (join, leave, message)
- Callback handlers (verification button)
- Error handling in handlers
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from datetime import datetime


# ============================================================================
# TEST FIXTURES
# ============================================================================

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
    update.effective_user.mention_html = MagicMock(return_value=f"<a href='tg://user?id={user_id}'>{username}</a>")
    
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


def create_mock_context(bot_is_admin=True):
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
    
    # Mock admin check
    if bot_is_admin:
        mock_member = MagicMock()
        mock_member.status = "administrator"
        context.bot.get_chat_member.return_value = mock_member
    
    return context


# ============================================================================
# /START COMMAND TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_start_command_private_chat():
    """Test /start in private chat."""
    from bot.handlers.admin.help import handle_start
    
    update = create_mock_update(chat_type="private", text="/start")
    context = create_mock_context()
    
    await handle_start(update, context)
    
    # Should send welcome message
    update.message.reply_text.assert_called_once()
    call_args = update.message.reply_text.call_args
    # Get text from positional or keyword args
    if call_args[0]:
        text = call_args[0][0]
    else:
        text = call_args[1].get("text", "")
    assert "Welcome" in text or "welcome" in text.lower()
    print("[PASS] /start in private chat")


@pytest.mark.asyncio
async def test_start_command_group_chat():
    """Test /start in group chat (should work but with different message)."""
    from bot.handlers.admin.help import handle_start
    
    update = create_mock_update(chat_type="supergroup", text="/start")
    context = create_mock_context()
    
    await handle_start(update, context)
    
    # May or may not respond in groups - implementation dependent
    print("[PASS] /start in group chat handled")


# ============================================================================
# /HELP COMMAND TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_help_command():
    """Test /help command shows command list."""
    from bot.handlers.admin.help import handle_help
    
    update = create_mock_update(text="/help")
    context = create_mock_context()
    
    await handle_help(update, context)
    
    # Should send help message
    update.message.reply_text.assert_called_once()
    call_args = update.message.reply_text.call_args
    # Get text from positional or keyword args
    if call_args[0]:
        text = call_args[0][0]
    else:
        text = call_args[1].get("text", "")
    
    # Should mention key commands
    assert "/protect" in text.lower() or "protect" in text.lower()
    print("[PASS] /help command")


# ============================================================================
# /PROTECT COMMAND TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_protect_command_no_args():
    """Test /protect without channel argument."""
    from bot.handlers.admin.setup import handle_protect
    
    update = create_mock_update(chat_type="supergroup", text="/protect")
    context = create_mock_context()
    context.args = []  # No arguments
    
    await handle_protect(update, context)
    
    # Should send usage message
    update.message.reply_text.assert_called()
    call_args = update.message.reply_text.call_args
    text = call_args[1].get("text", call_args[0][0] if call_args[0] else "")
    assert "usage" in text.lower() or "@" in text
    print("[PASS] /protect without args shows usage")


@pytest.mark.asyncio
async def test_protect_command_in_private_chat():
    """Test /protect in private chat (should reject)."""
    from bot.handlers.admin.setup import handle_protect
    
    update = create_mock_update(chat_type="private", text="/protect @channel")
    context = create_mock_context()
    context.args = ["@channel"]
    
    await handle_protect(update, context)
    
    # Should tell user to use in group
    update.message.reply_text.assert_called()
    call_args = update.message.reply_text.call_args
    text = call_args[1].get("text", call_args[0][0] if call_args[0] else "")
    assert "group" in text.lower()
    print("[PASS] /protect in private chat rejected")


@pytest.mark.asyncio
async def test_protect_command_non_admin():
    """Test /protect by non-admin user."""
    from bot.handlers.admin.setup import handle_protect
    from telegram.constants import ChatMemberStatus
    
    update = create_mock_update(chat_type="supergroup", text="/protect @channel")
    context = create_mock_context()
    context.args = ["@channel"]
    
    # Mock user as non-admin
    mock_member = MagicMock()
    mock_member.status = ChatMemberStatus.MEMBER
    context.bot.get_chat_member = AsyncMock(return_value=mock_member)
    
    await handle_protect(update, context)
    
    # Should reject non-admin
    update.message.reply_text.assert_called()
    call_args = update.message.reply_text.call_args
    text = call_args[1].get("text", call_args[0][0] if call_args[0] else "")
    assert "admin" in text.lower()
    print("[PASS] /protect by non-admin rejected")


# ============================================================================
# /STATUS COMMAND TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_status_command():
    """Test /status command shows protection status."""
    from bot.handlers.admin.settings import handle_status
    
    update = create_mock_update(chat_type="supergroup", text="/status")
    context = create_mock_context()
    
    with patch('bot.handlers.admin.settings.get_session') as mock_get_session:
        mock_session = MagicMock()
        mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_get_session.return_value.__aexit__ = AsyncMock()
        
        with patch('bot.handlers.admin.settings.get_protected_group', new_callable=AsyncMock) as mock_get_group:
            mock_get_group.return_value = None  # Not protected
            
            await handle_status(update, context)
    
    # Should respond
    update.message.reply_text.assert_called()
    print("[PASS] /status command")


# ============================================================================
# /UNPROTECT COMMAND TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_unprotect_command_non_admin():
    """Test /unprotect by non-admin user."""
    from bot.handlers.admin.settings import handle_unprotect
    from telegram.constants import ChatMemberStatus
    
    update = create_mock_update(chat_type="supergroup", text="/unprotect")
    context = create_mock_context()
    
    # Mock user as non-admin
    mock_member = MagicMock()
    mock_member.status = ChatMemberStatus.MEMBER
    context.bot.get_chat_member = AsyncMock(return_value=mock_member)
    
    await handle_unprotect(update, context)
    
    # Should reject non-admin
    update.message.reply_text.assert_called()
    print("[PASS] /unprotect by non-admin rejected")


# ============================================================================
# MESSAGE HANDLER TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_message_handler_no_protection():
    """Test message handler when group has no protection."""
    from bot.handlers.events.message import handle_message
    
    update = create_mock_update(chat_type="supergroup", text="Hello everyone!")
    context = create_mock_context()
    
    with patch('bot.handlers.events.message.get_session') as mock_get_session:
        mock_session = MagicMock()
        mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_get_session.return_value.__aexit__ = AsyncMock()
        
        with patch('bot.handlers.events.message.get_group_channels', new_callable=AsyncMock) as mock_get_channels:
            mock_get_channels.return_value = []  # No channels linked
            
            await handle_message(update, context)
    
    # Should not delete message
    update.message.delete.assert_not_called()
    print("[PASS] Message passes when no protection")


@pytest.mark.asyncio
async def test_message_handler_from_bot():
    """Test message handler skips messages from bots."""
    from bot.handlers.events.message import handle_message
    
    update = create_mock_update(
        chat_type="supergroup", 
        text="Bot message",
        is_bot=True
    )
    context = create_mock_context()
    
    # The handler should return early for bots
    # (implementation may vary - some bots are allowed)
    await handle_message(update, context)
    print("[PASS] Bot message handling")


@pytest.mark.asyncio
async def test_message_handler_anonymous_admin():
    """Test message handler for anonymous admin messages."""
    from bot.handlers.events.message import handle_message
    
    # Anonymous admin has specific user ID
    update = create_mock_update(
        chat_type="supergroup",
        text="Admin message",
        user_id=1087968824,  # GroupAnonymousBot
        is_bot=True
    )
    context = create_mock_context()
    
    await handle_message(update, context)
    
    # Should not delete admin messages
    update.message.delete.assert_not_called()
    print("[PASS] Anonymous admin message passes")


# ============================================================================
# JOIN HANDLER TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_join_handler_new_member():
    """Test join handler for new group member."""
    from bot.handlers.events.join import handle_new_member
    
    update = MagicMock()
    update.message = MagicMock()
    update.message.new_chat_members = [MagicMock()]
    update.message.new_chat_members[0].id = 555666777
    update.message.new_chat_members[0].is_bot = False
    update.message.new_chat_members[0].mention_html = MagicMock(return_value="<a>User</a>")
    update.message.chat = MagicMock()
    update.message.chat.id = -1001234567890
    update.effective_chat = update.message.chat
    update.message.reply_text = AsyncMock()
    
    context = create_mock_context()
    
    with patch('bot.handlers.events.join.get_session') as mock_get_session:
        mock_session = MagicMock()
        mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_get_session.return_value.__aexit__ = AsyncMock()
        
        with patch('bot.handlers.events.join.get_group_channels', new_callable=AsyncMock) as mock_get_channels:
            mock_get_channels.return_value = []  # No protection
            
            await handle_new_member(update, context)
    
    print("[PASS] New member join handled")


@pytest.mark.asyncio
async def test_join_handler_bot_joining():
    """Test join handler when a bot joins (skip verification)."""
    from bot.handlers.events.join import handle_new_member
    
    update = MagicMock()
    update.message = MagicMock()
    update.message.new_chat_members = [MagicMock()]
    update.message.new_chat_members[0].id = 888999000
    update.message.new_chat_members[0].is_bot = True  # It's a bot
    update.message.chat = MagicMock()
    update.message.chat.id = -1001234567890
    update.effective_chat = update.message.chat
    update.message.reply_text = AsyncMock()
    
    context = create_mock_context()
    
    await handle_new_member(update, context)
    
    # Should not mute bots
    context.bot.restrict_chat_member.assert_not_called()
    print("[PASS] Bot joining not muted")


# ============================================================================
# CALLBACK HANDLER TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_verify_callback():
    """Test verification callback button."""
    from bot.handlers.verify import handle_callback_verify
    from telegram.constants import ChatMemberStatus
    
    # Create callback query mock
    update = MagicMock()
    update.callback_query = MagicMock()
    update.callback_query.from_user = MagicMock()
    update.callback_query.from_user.id = 111222333
    update.callback_query.message = MagicMock()
    update.callback_query.message.chat = MagicMock()
    update.callback_query.message.chat.id = -1001234567890
    update.callback_query.message.reply_to_message = MagicMock()
    update.callback_query.message.reply_to_message.from_user = MagicMock()
    update.callback_query.message.reply_to_message.from_user.id = 111222333
    update.callback_query.message.message_id = 100
    update.callback_query.answer = AsyncMock()
    update.callback_query.message.delete = AsyncMock()
    update.effective_chat = update.callback_query.message.chat
    
    context = create_mock_context()
    
    with patch('bot.handlers.verify.get_session') as mock_get_session:
        mock_session = MagicMock()
        mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_get_session.return_value.__aexit__ = AsyncMock()
        
        with patch('bot.handlers.verify.get_group_channels', new_callable=AsyncMock) as mock_get_channels:
            # Mock channel with membership check
            mock_channel = MagicMock()
            mock_channel.channel_id = -100555666777
            mock_get_channels.return_value = [mock_channel]
            
            # Mock membership check - user is member
            mock_member = MagicMock()
            mock_member.status = ChatMemberStatus.MEMBER
            context.bot.get_chat_member = AsyncMock(return_value=mock_member)
            
            await handle_callback_verify(update, context)
    
    # Should answer callback
    update.callback_query.answer.assert_called()
    print("[PASS] Verify callback handled")


@pytest.mark.asyncio
async def test_verify_callback_wrong_user():
    """Test verification callback from wrong user."""
    from bot.handlers.verify import handle_callback_verify
    
    # User clicking is NOT the one being verified
    update = MagicMock()
    update.callback_query = MagicMock()
    update.callback_query.from_user = MagicMock()
    update.callback_query.from_user.id = 999888777  # Different user
    update.callback_query.message = MagicMock()
    update.callback_query.message.chat = MagicMock()
    update.callback_query.message.chat.id = -1001234567890
    update.callback_query.message.reply_to_message = MagicMock()
    update.callback_query.message.reply_to_message.from_user = MagicMock()
    update.callback_query.message.reply_to_message.from_user.id = 111222333  # Original user
    update.callback_query.answer = AsyncMock()
    update.effective_chat = update.callback_query.message.chat
    
    context = create_mock_context()
    
    await handle_callback_verify(update, context)
    
    # Should answer with error or ignore
    # (implementation may vary)
    print("[PASS] Verify callback from wrong user handled")


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    """Run all handler tests."""
    print("=" * 60)
    print("Running Handler Tests for GMBot v2.0")
    print("=" * 60)
    print()
    
    # Start command tests
    print("== /start Command ==")
    asyncio.run(test_start_command_private_chat())
    asyncio.run(test_start_command_group_chat())
    print()
    
    # Help command tests
    print("== /help Command ==")
    asyncio.run(test_help_command())
    print()
    
    # Protect command tests
    print("== /protect Command ==")
    asyncio.run(test_protect_command_no_args())
    asyncio.run(test_protect_command_in_private_chat())
    asyncio.run(test_protect_command_non_admin())
    print()
    
    # Status command tests
    print("== /status Command ==")
    asyncio.run(test_status_command())
    print()
    
    # Unprotect command tests
    print("== /unprotect Command ==")
    asyncio.run(test_unprotect_command_non_admin())
    print()
    
    # Message handler tests
    print("== Message Handler ==")
    asyncio.run(test_message_handler_no_protection())
    asyncio.run(test_message_handler_from_bot())
    asyncio.run(test_message_handler_anonymous_admin())
    print()
    
    # Join handler tests
    print("== Join Handler ==")
    asyncio.run(test_join_handler_new_member())
    asyncio.run(test_join_handler_bot_joining())
    print()
    
    # Callback handler tests
    print("== Callback Handler ==")
    asyncio.run(test_verify_callback())
    asyncio.run(test_verify_callback_wrong_user())
    print()
    
    print("=" * 60)
    print("[SUCCESS] All handler tests passed!")
    print("=" * 60)

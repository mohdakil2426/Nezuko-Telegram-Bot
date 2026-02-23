"""
Handler tests for Nezuko bot.

Tests command handlers (/start, /help, /protect, /status, /unprotect),
event handlers (join, message), and callback handlers (verify button)
against the real handler implementations using mocked Telegram objects.

Phase 58 note: All DB patches now target insforge_client functions directly
(no more get_session / crud.* — those were replaced by REST calls).
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from telegram.constants import ChatMemberStatus

from tests.utils import create_mock_context, create_mock_update


class TestStartHandler:
    """/start command handler tests."""

    @pytest.mark.asyncio
    async def test_start_in_private_chat_sends_welcome(self):
        """handle_start replies with a welcome message in private chat."""
        from apps.bot.handlers.admin.help import handle_start

        update = create_mock_update(chat_type="private", text="/start")
        context = create_mock_context()

        await handle_start(update, context)

        update.message.reply_text.assert_called_once()
        call_args = update.message.reply_text.call_args
        text = call_args[0][0] if call_args[0] else call_args[1].get("text", "")
        assert "welcome" in text.lower() or "nezuko" in text.lower()

    @pytest.mark.asyncio
    async def test_start_in_group_chat_does_not_crash(self):
        """handle_start executes without exception in a group chat."""
        from apps.bot.handlers.admin.help import handle_start

        update = create_mock_update(chat_type="supergroup", text="/start")
        context = create_mock_context()

        # Should not raise
        await handle_start(update, context)


class TestHelpHandler:
    """/help command handler tests."""

    @pytest.mark.asyncio
    async def test_help_mentions_protect_command(self):
        """handle_help sends a message referencing /protect."""
        from apps.bot.handlers.admin.help import handle_help

        update = create_mock_update(text="/help")
        context = create_mock_context()

        await handle_help(update, context)

        update.message.reply_text.assert_called_once()
        call_args = update.message.reply_text.call_args
        text = call_args[0][0] if call_args[0] else call_args[1].get("text", "")
        assert "/protect" in text.lower() or "protect" in text.lower()


class TestProtectHandler:
    """/protect command handler tests."""

    @pytest.mark.asyncio
    async def test_protect_without_args_shows_usage(self):
        """handle_protect with no arguments replies with usage information."""
        from apps.bot.handlers.admin.setup import handle_protect

        update = create_mock_update(chat_type="supergroup", text="/protect")
        context = create_mock_context(user_status=ChatMemberStatus.ADMINISTRATOR)
        context.args = []

        await handle_protect(update, context)

        update.message.reply_text.assert_called()

    @pytest.mark.asyncio
    async def test_protect_in_private_chat_is_rejected(self):
        """handle_protect in private chat tells user to use it in a group."""
        from apps.bot.handlers.admin.setup import handle_protect

        update = create_mock_update(chat_type="private", text="/protect @channel")
        context = create_mock_context()
        context.args = ["@channel"]

        await handle_protect(update, context)

        update.message.reply_text.assert_called()
        call_args = update.message.reply_text.call_args
        text = call_args[1].get("text", call_args[0][0] if call_args[0] else "")
        assert "group" in text.lower()

    @pytest.mark.asyncio
    async def test_protect_by_non_admin_is_rejected(self):
        """handle_protect by a non-admin replies with admin-required message."""
        from apps.bot.handlers.admin.setup import handle_protect

        update = create_mock_update(chat_type="supergroup", text="/protect @channel")
        context = create_mock_context(user_status=ChatMemberStatus.MEMBER)
        context.args = ["@channel"]

        await handle_protect(update, context)

        update.message.reply_text.assert_called()
        call_args = update.message.reply_text.call_args
        text = call_args[1].get("text", call_args[0][0] if call_args[0] else "")
        assert "admin" in text.lower()


class TestStatusHandler:
    """/status command handler tests."""

    @pytest.mark.asyncio
    async def test_status_replies_when_group_unprotected(self):
        """handle_status replies even when group has no protection configured."""
        from apps.bot.handlers.admin.settings import handle_status

        update = create_mock_update(chat_type="supergroup", text="/status")
        context = create_mock_context()

        with patch(
            "apps.bot.handlers.admin.settings.insforge_client.get_protected_group",
            new_callable=AsyncMock,
        ) as mock_get_group:
            mock_get_group.return_value = None  # not protected

            await handle_status(update, context)

        update.message.reply_text.assert_called()


class TestUnprotectHandler:
    """/unprotect command handler tests."""

    @pytest.mark.asyncio
    async def test_unprotect_by_non_admin_is_rejected(self):
        """handle_unprotect by a non-admin member is refused."""
        from apps.bot.handlers.admin.settings import handle_unprotect

        update = create_mock_update(chat_type="supergroup", text="/unprotect")
        context = create_mock_context(user_status=ChatMemberStatus.MEMBER)

        await handle_unprotect(update, context)

        update.message.reply_text.assert_called()


class TestMessageHandler:
    """Message event handler tests."""

    @pytest.mark.asyncio
    async def test_message_passes_when_no_protection(self):
        """handle_message does not delete messages in unprotected groups."""
        from apps.bot.handlers.events.message import handle_message

        update = create_mock_update(chat_type="supergroup", text="Hello!")
        context = create_mock_context()

        with patch(
            "apps.bot.handlers.events.message.insforge_client.get_group_channels",
            new_callable=AsyncMock,
        ) as mock_channels:
            mock_channels.return_value = []  # No enforcement

            await handle_message(update, context)

        update.message.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_bot_message_does_not_crash(self):
        """handle_message does not raise for messages sent by bots."""
        from apps.bot.handlers.events.message import handle_message

        update = create_mock_update(chat_type="supergroup", text="Bot msg", is_bot=True)
        context = create_mock_context()

        await handle_message(update, context)  # Must not raise

    @pytest.mark.asyncio
    async def test_anonymous_admin_message_is_allowed(self):
        """handle_message does not delete messages from anonymous admins (GroupAnonymousBot)."""
        from apps.bot.handlers.events.message import handle_message

        # GroupAnonymousBot ID = 1087968824
        update = create_mock_update(
            chat_type="supergroup",
            text="Admin msg",
            user_id=1087968824,
            is_bot=True,
        )
        context = create_mock_context()

        await handle_message(update, context)

        update.message.delete.assert_not_called()


class TestJoinHandler:
    """New member join handler tests."""

    @pytest.mark.asyncio
    async def test_new_human_member_is_processed(self):
        """handle_new_member runs without error for a human joining."""
        from apps.bot.handlers.events.join import handle_new_member

        update = MagicMock()
        new_member = MagicMock()
        new_member.id = 555666777
        new_member.is_bot = False
        new_member.mention_html = MagicMock(return_value="<a>User</a>")
        update.message = MagicMock()
        update.message.new_chat_members = [new_member]
        update.message.chat = MagicMock()
        update.message.chat.id = -1001234567890
        update.effective_chat = update.message.chat
        update.message.reply_text = AsyncMock()

        context = create_mock_context()

        with patch(
            "apps.bot.handlers.events.join.insforge_client.get_group_channels",
            new_callable=AsyncMock,
        ) as mock_channels:
            mock_channels.return_value = []  # No protection

            await handle_new_member(update, context)

    @pytest.mark.asyncio
    async def test_bot_joining_is_not_muted(self):
        """handle_new_member does not restrict_chat_member when a bot joins."""
        from apps.bot.handlers.events.join import handle_new_member

        update = MagicMock()
        bot_member = MagicMock()
        bot_member.id = 888999000
        bot_member.is_bot = True
        update.message = MagicMock()
        update.message.new_chat_members = [bot_member]
        update.message.chat = MagicMock()
        update.message.chat.id = -1001234567890
        update.effective_chat = update.message.chat
        update.message.reply_text = AsyncMock()

        context = create_mock_context()

        await handle_new_member(update, context)

        context.bot.restrict_chat_member.assert_not_called()


class TestVerifyCallbackHandler:
    """Verify inline button callback handler tests."""

    @pytest.mark.asyncio
    async def test_verify_callback_answers_query(self):
        """handle_callback_verify always answers the callback query."""
        from apps.bot.handlers.verify import handle_callback_verify

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
        update.callback_query.delete_message = AsyncMock()
        update.callback_query.message.delete = AsyncMock()
        update.effective_chat = update.callback_query.message.chat
        update.effective_user = update.callback_query.from_user

        context = create_mock_context(user_status=ChatMemberStatus.MEMBER)

        with patch(
            "apps.bot.handlers.verify.insforge_client.get_group_channels",
            new_callable=AsyncMock,
        ) as mock_channels:
            mock_channel = MagicMock()
            mock_channel.channel_id = -100555666777
            mock_channels.return_value = [mock_channel]

            with patch(
                "apps.bot.handlers.verify.check_multi_membership",
                new_callable=AsyncMock,
            ) as mock_verify:
                mock_verify.return_value = []  # All channels verified

                with patch(
                    "apps.bot.handlers.verify.unmute_user",
                    new_callable=AsyncMock,
                ) as mock_unmute:
                    mock_unmute.return_value = True

                    await handle_callback_verify(update, context)

        update.callback_query.answer.assert_called()

    @pytest.mark.asyncio
    async def test_verify_callback_wrong_user_still_answers(self):
        """handle_callback_verify answers even when pressed by wrong user."""
        from apps.bot.handlers.verify import handle_callback_verify

        update = MagicMock()
        update.callback_query = MagicMock()
        update.callback_query.from_user = MagicMock()
        update.callback_query.from_user.id = 999888777  # different user
        update.callback_query.message = MagicMock()
        update.callback_query.message.chat = MagicMock()
        update.callback_query.message.chat.id = -1001234567890
        update.callback_query.message.reply_to_message = MagicMock()
        update.callback_query.message.reply_to_message.from_user = MagicMock()
        update.callback_query.message.reply_to_message.from_user.id = 111222333  # original
        update.callback_query.answer = AsyncMock()
        update.callback_query.delete_message = AsyncMock()
        update.effective_chat = update.callback_query.message.chat
        update.effective_user = update.callback_query.from_user

        context = create_mock_context()

        with patch(
            "apps.bot.handlers.verify.insforge_client.get_group_channels",
            new_callable=AsyncMock,
        ) as mock_channels:
            mock_channels.return_value = []  # no channels → answers gracefully

            await handle_callback_verify(update, context)

        update.callback_query.answer.assert_called()

"""
Unit tests for the verification service.

Tests membership checking with Redis caching, multi-channel verification,
cache invalidation, and statistics tracking against the real service API.
"""

from unittest.mock import AsyncMock, patch

import pytest
from telegram.constants import ChatMemberStatus

from tests.bot.conftest import MockChannel
from tests.utils import create_mock_context


class TestCheckMembership:
    """Tests for check_membership() — single channel verification."""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_true_without_api_call(self):
        """Cached '1' value returns True and skips the Telegram API."""
        from apps.bot.services.verification import check_membership

        context = create_mock_context()

        with patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = "1"  # positive cache hit

            result = await check_membership(123, -1001234567890, context)

        assert result is True
        mock_get.assert_called_once()
        context.bot.get_chat_member.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_hit_returns_false_without_api_call(self):
        """Cached '0' value returns False and skips the Telegram API."""
        from apps.bot.services.verification import check_membership

        context = create_mock_context()

        with patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = "0"  # negative cache hit

            result = await check_membership(123, -1001234567890, context)

        assert result is False
        context.bot.get_chat_member.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_miss_calls_api_and_caches_result(self):
        """On cache miss, Telegram API is called and result is cached."""
        from apps.bot.services.verification import check_membership

        context = create_mock_context(user_status=ChatMemberStatus.MEMBER)

        with (
            patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_get,
            patch("apps.bot.services.verification.cache_set", new_callable=AsyncMock) as mock_set,
        ):
            mock_get.return_value = None  # cache miss

            result = await check_membership(123, -1001234567890, context)

        assert result is True
        mock_get.assert_called_once()
        context.bot.get_chat_member.assert_called_once()
        mock_set.assert_called_once()

    @pytest.mark.asyncio
    async def test_non_member_returns_false(self, mocker):
        """User with LEFT status returns False."""
        from apps.bot.services.verification import check_membership

        context = create_mock_context()
        left_member = mocker.MagicMock()
        left_member.status = ChatMemberStatus.LEFT
        context.bot.get_chat_member = mocker.AsyncMock(return_value=left_member)

        with (
            patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_get,
            patch("apps.bot.services.verification.cache_set", new_callable=AsyncMock),
        ):
            mock_get.return_value = None

            result = await check_membership(123, -1001234567890, context)

        assert result is False

    @pytest.mark.asyncio
    async def test_telegram_error_returns_false(self, mocker):
        """TelegramError during API call returns False (fail-safe)."""
        from telegram.error import TelegramError
        from apps.bot.services.verification import check_membership

        context = create_mock_context()
        context.bot.get_chat_member = mocker.AsyncMock(side_effect=TelegramError("Bot was kicked"))

        with (
            patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_get,
        ):
            mock_get.return_value = None

            result = await check_membership(123, -1001234567890, context)

        assert result is False


class TestCheckMultiMembership:
    """Tests for check_multi_membership() — multi-channel verification."""

    @pytest.mark.asyncio
    async def test_all_channels_verified_returns_empty_list(self, mock_context, mock_channels):
        """Returns empty list when user is member of all channels."""
        from apps.bot.services.verification import check_multi_membership

        with patch(
            "apps.bot.services.verification.check_membership", new_callable=AsyncMock
        ) as mock_check:
            mock_check.return_value = True

            missing = await check_multi_membership(
                user_id=123, channels=mock_channels, context=mock_context
            )

        assert missing == []
        assert mock_check.call_count == len(mock_channels)

    @pytest.mark.asyncio
    async def test_some_channels_missing(self, mock_context, mock_channels):
        """Returns list of channels user is NOT a member of."""
        from apps.bot.services.verification import check_multi_membership

        with patch(
            "apps.bot.services.verification.check_membership", new_callable=AsyncMock
        ) as mock_check:
            mock_check.side_effect = [True, False, False]

            missing = await check_multi_membership(
                user_id=123, channels=mock_channels, context=mock_context
            )

        assert len(missing) == 2
        assert mock_channels[1] in missing
        assert mock_channels[2] in missing

    @pytest.mark.asyncio
    async def test_empty_channels_returns_empty_list(self, mock_context):
        """No channels to check returns empty missing list."""
        from apps.bot.services.verification import check_multi_membership

        missing = await check_multi_membership(user_id=123, channels=[], context=mock_context)

        assert missing == []


class TestInvalidateCache:
    """Tests for invalidate_cache()."""

    @pytest.mark.asyncio
    async def test_invalidate_success(self):
        """Successful cache delete returns True."""
        from apps.bot.services.verification import invalidate_cache

        with patch(
            "apps.bot.services.verification.cache_delete", new_callable=AsyncMock
        ) as mock_del:
            mock_del.return_value = True

            result = await invalidate_cache(123, -1001234567890)

        assert result is True
        mock_del.assert_called_once_with("verify:123:-1001234567890")

    @pytest.mark.asyncio
    async def test_invalidate_connection_error_returns_false(self):
        """ConnectionError during delete returns False gracefully."""
        from apps.bot.services.verification import invalidate_cache

        with patch(
            "apps.bot.services.verification.cache_delete", new_callable=AsyncMock
        ) as mock_del:
            mock_del.side_effect = ConnectionError("Redis unavailable")

            result = await invalidate_cache(123, -1001234567890)

        assert result is False


class TestCacheStats:
    """Tests for get_cache_stats() and reset_cache_stats()."""

    def test_reset_then_stats_are_zero(self):
        """After reset, all stats counters are 0."""
        from apps.bot.services.verification import get_cache_stats, reset_cache_stats

        reset_cache_stats()
        stats = get_cache_stats()

        assert stats["cache_hits"] == 0
        assert stats["cache_misses"] == 0
        assert stats["total_checks"] == 0
        assert stats["hit_rate_percent"] == 0.0


class TestProtocol:
    """Tests for HasChannelId Protocol compliance."""

    def test_mock_channel_satisfies_protocol(self):
        """MockChannel correctly implements HasChannelId protocol."""
        from apps.bot.services.verification import HasChannelId

        channel = MockChannel(channel_id=-1001234567890, title="Test")

        assert hasattr(channel, "channel_id")
        assert isinstance(channel.channel_id, (int, str))

        # Verify protocol usage compiles and returns correctly
        def use_protocol(c: HasChannelId) -> int | str:
            return c.channel_id

        assert use_protocol(channel) == -1001234567890

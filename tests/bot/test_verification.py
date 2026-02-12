"""
Unit tests for the verification service.

Tests for membership verification with caching, multi-channel checks,
and Protocol-based type safety.
"""

from unittest.mock import AsyncMock, patch

import pytest
from telegram.constants import ChatMemberStatus

from tests.bot.conftest import MockChannel


@pytest.mark.asyncio
async def test_check_membership_cache_hit(mock_context):
    """Test verification returns cached result without API call."""
    from apps.bot.services.verification import check_membership

    with patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_cache:
        mock_cache.return_value = "1"  # Cached as member

        result = await check_membership(123, -1001234567890, mock_context)

        assert result is True
        mock_cache.assert_called_once()
        # API should NOT be called when cache hits
        mock_context.bot.get_chat_member.assert_not_called()


@pytest.mark.asyncio
async def test_check_membership_cache_miss_calls_api(mock_context):
    """Test verification calls API on cache miss and caches result."""
    from apps.bot.services.verification import check_membership

    with (
        patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_cache_get,
        patch("apps.bot.services.verification.cache_set", new_callable=AsyncMock) as mock_cache_set,
    ):
        mock_cache_get.return_value = None  # Cache miss

        result = await check_membership(123, -1001234567890, mock_context)

        assert result is True
        mock_cache_get.assert_called_once()
        mock_context.bot.get_chat_member.assert_called_once()
        mock_cache_set.assert_called_once()


@pytest.mark.asyncio
async def test_check_membership_non_member(mock_context, mocker):
    """Test verification returns False for non-members."""
    from apps.bot.services.verification import check_membership

    # Mock get_chat_member to return LEFT status
    member = mocker.MagicMock()
    member.status = ChatMemberStatus.LEFT
    mock_context.bot.get_chat_member = mocker.AsyncMock(return_value=member)

    with (
        patch("apps.bot.services.verification.cache_get", new_callable=AsyncMock) as mock_cache_get,
        patch("apps.bot.services.verification.cache_set", new_callable=AsyncMock),
    ):
        mock_cache_get.return_value = None

        result = await check_membership(123, -1001234567890, mock_context)

        assert result is False


@pytest.mark.asyncio
async def test_check_multi_membership_all_verified(mock_context, mock_channels):
    """Test multi-channel check returns empty list when all verified."""
    from apps.bot.services.verification import check_multi_membership

    with patch(
        "apps.bot.services.verification.check_membership", new_callable=AsyncMock
    ) as mock_check:
        mock_check.return_value = True  # All channels verified

        missing = await check_multi_membership(
            user_id=123,
            channels=mock_channels,
            context=mock_context,
        )

        assert missing == []
        assert mock_check.call_count == len(mock_channels)


@pytest.mark.asyncio
async def test_check_multi_membership_some_missing(mock_context, mock_channels):
    """Test multi-channel check returns missing channels."""
    from apps.bot.services.verification import check_multi_membership

    with patch(
        "apps.bot.services.verification.check_membership", new_callable=AsyncMock
    ) as mock_check:
        # First channel verified, others not
        mock_check.side_effect = [True, False, False]

        missing = await check_multi_membership(
            user_id=123,
            channels=mock_channels,
            context=mock_context,
        )

        assert len(missing) == 2
        assert mock_channels[1] in missing
        assert mock_channels[2] in missing


@pytest.mark.asyncio
async def test_invalidate_cache_success():
    """Test cache invalidation succeeds."""
    from apps.bot.services.verification import invalidate_cache

    with patch(
        "apps.bot.services.verification.cache_delete", new_callable=AsyncMock
    ) as mock_delete:
        mock_delete.return_value = True

        result = await invalidate_cache(123, -1001234567890)

        assert result is True
        mock_delete.assert_called_once_with("verify:123:-1001234567890")


@pytest.mark.asyncio
async def test_invalidate_cache_handles_error():
    """Test cache invalidation handles connection errors gracefully."""
    from apps.bot.services.verification import invalidate_cache

    with patch(
        "apps.bot.services.verification.cache_delete", new_callable=AsyncMock
    ) as mock_delete:
        mock_delete.side_effect = ConnectionError("Redis unavailable")

        result = await invalidate_cache(123, -1001234567890)

        assert result is False


def test_cache_stats_tracking():
    """Test cache statistics are tracked correctly."""
    from apps.bot.services.verification import get_cache_stats, reset_cache_stats

    reset_cache_stats()
    stats = get_cache_stats()

    assert stats["cache_hits"] == 0
    assert stats["cache_misses"] == 0
    assert stats["total_checks"] == 0
    assert stats["hit_rate_percent"] == 0.0


def test_mock_channel_implements_protocol():
    """Test MockChannel implements HasChannelId protocol."""
    from apps.bot.services.verification import HasChannelId

    channel = MockChannel(channel_id=-1001234567890, title="Test")

    # Verify it satisfies the protocol
    assert hasattr(channel, "channel_id")
    assert isinstance(channel.channel_id, (int, str))

    # Type checker should accept this
    def accepts_protocol(c: HasChannelId) -> int | str:
        return c.channel_id

    assert accepts_protocol(channel) == -1001234567890

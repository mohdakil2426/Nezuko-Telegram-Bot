"""
Unit tests for bot services: cache, protection, and verification service utilities.

Tests:
- Cache TTL jitter distribution
- Cache graceful degradation (no Redis)
- Protection service retry logic on TelegramError
- Protection stats tracking
- Verification stats tracking
- InsForge CRUD client (mocked HTTP)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestCacheTTL:
    """Tests for cache TTL jitter helper."""

    def test_ttl_jitter_within_bounds(self):
        """get_ttl_with_jitter returns values within ±15% of base TTL."""
        from apps.bot.core.cache import get_ttl_with_jitter

        results = [get_ttl_with_jitter(600, 15) for _ in range(200)]

        # 600 ± 15% → [510, 690]
        assert all(510 <= r <= 690 for r in results), "Some TTL values out of range"

    def test_ttl_jitter_has_variance(self):
        """get_ttl_with_jitter produces varied results (not deterministic)."""
        from apps.bot.core.cache import get_ttl_with_jitter

        results = {get_ttl_with_jitter(600, 15) for _ in range(100)}

        # Expect at least 10 distinct values in 100 runs
        assert len(results) > 10, "TTL jitter lacks variance — possible RNG issue"

    def test_ttl_zero_jitter_is_exact(self):
        """Zero jitter percent always returns the base TTL exactly."""
        from apps.bot.core.cache import get_ttl_with_jitter

        results = [get_ttl_with_jitter(300, 0) for _ in range(10)]
        assert all(r == 300 for r in results)


class TestCacheDegradation:
    """Tests for cache_get / cache_set when Redis is unavailable."""

    @pytest.mark.asyncio
    async def test_cache_get_returns_none_when_redis_unavailable(self):
        """cache_get returns None without raising when Redis is down."""
        from apps.bot.core.cache import cache_get

        with (
            patch("apps.bot.core.cache._redis_available", False),
            patch("apps.bot.core.cache._redis_client", None),
        ):
            result = await cache_get("any_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_cache_set_returns_false_when_redis_unavailable(self):
        """cache_set returns False without raising when Redis is down."""
        from apps.bot.core.cache import cache_set

        with (
            patch("apps.bot.core.cache._redis_available", False),
            patch("apps.bot.core.cache._redis_client", None),
        ):
            result = await cache_set("any_key", "value", 60)

        assert result is False


class TestProtectionService:
    """Tests for the protection service (mute/unmute with retry)."""

    @pytest.mark.asyncio
    async def test_restrict_user_success_on_first_attempt(self):
        """restrict_user returns True when API call succeeds immediately."""
        from apps.bot.services.protection import restrict_user

        context = MagicMock()
        context.bot.restrict_chat_member = AsyncMock(return_value=True)

        result = await restrict_user(-1001234567890, 123, context)

        assert result is True
        assert context.bot.restrict_chat_member.call_count == 1

    @pytest.mark.asyncio
    async def test_restrict_user_retries_on_telegram_error(self):
        """restrict_user retries up to MAX_RETRIES on TelegramError then returns True."""
        from telegram.error import TelegramError
        from apps.bot.services.protection import restrict_user, MAX_RETRIES

        context = MagicMock()
        call_count = 0

        async def flaky_restrict(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < MAX_RETRIES:
                raise TelegramError("Transient error")
            return True

        context.bot.restrict_chat_member = AsyncMock(side_effect=flaky_restrict)

        with patch("apps.bot.services.protection.asyncio.sleep", new_callable=AsyncMock):
            result = await restrict_user(-1001234567890, 456, context)

        assert result is True
        assert call_count == MAX_RETRIES

    @pytest.mark.asyncio
    async def test_restrict_user_returns_false_after_max_retries(self):
        """restrict_user returns False when all retry attempts fail."""
        from telegram.error import TelegramError
        from apps.bot.services.protection import restrict_user

        context = MagicMock()
        context.bot.restrict_chat_member = AsyncMock(
            side_effect=TelegramError("Persistent error")
        )

        with patch("apps.bot.services.protection.asyncio.sleep", new_callable=AsyncMock):
            result = await restrict_user(-1001234567890, 789, context)

        assert result is False

    def test_protection_stats_reset(self):
        """reset_protection_stats zeroes all counters."""
        from apps.bot.services.protection import get_protection_stats, reset_protection_stats

        reset_protection_stats()
        stats = get_protection_stats()

        assert stats["mute_count"] == 0
        assert stats["unmute_count"] == 0
        assert stats["error_count"] == 0


class TestVerificationStats:
    """Tests for verification cache stats helpers."""

    def test_reset_then_get_returns_zeros(self):
        """After reset, get_cache_stats returns all-zero dict."""
        from apps.bot.services.verification import get_cache_stats, reset_cache_stats

        reset_cache_stats()
        stats = get_cache_stats()

        assert stats["cache_hits"] == 0
        assert stats["cache_misses"] == 0
        assert stats["hit_rate_percent"] == 0.0


@pytest.mark.asyncio
class TestInsForgeClientCrud:
    """Unit tests for insforge_client CRUD helpers — mocked HTTP layer."""

    async def test_get_owner_returns_none_when_not_found(self):
        """get_owner returns None when the REST API returns an empty list."""
        from apps.bot.core import insforge_client

        with patch.object(insforge_client, "_get", new=AsyncMock(return_value=[])):
            result = await insforge_client.get_owner(user_id=12345)
            assert result is None

    async def test_get_owner_returns_owner_when_found(self):
        """get_owner deserialises the first row into an Owner dataclass."""
        from apps.bot.core import insforge_client

        fake_row = {"user_id": 99001, "username": "testuser", "created_at": None, "updated_at": None}
        with patch.object(insforge_client, "_get", new=AsyncMock(return_value=[fake_row])):
            owner = await insforge_client.get_owner(user_id=99001)
            assert owner is not None
            assert owner.user_id == 99001
            assert owner.username == "testuser"

    async def test_get_protected_group_returns_none_when_missing(self):
        """get_protected_group returns None for an unknown group_id."""
        from apps.bot.core import insforge_client

        with patch.object(insforge_client, "_get", new=AsyncMock(return_value=[])):
            result = await insforge_client.get_protected_group(group_id=-1001111111111)
            assert result is None

    async def test_get_group_channels_returns_empty_when_no_links(self):
        """get_group_channels returns [] when group has no channel links."""
        from apps.bot.core import insforge_client

        with patch.object(insforge_client, "_get", new=AsyncMock(return_value=[])):
            channels = await insforge_client.get_group_channels(group_id=-1001111111111)
            assert channels == []

    async def test_get_all_protected_groups_returns_list(self):
        """get_all_protected_groups returns a properly-typed list."""
        from apps.bot.core import insforge_client

        fake_rows = [
            {"group_id": -1001, "owner_id": 1, "title": "G1", "enabled": True},
            {"group_id": -1002, "owner_id": 2, "title": "G2", "enabled": True},
        ]
        with patch.object(insforge_client, "_get", new=AsyncMock(return_value=fake_rows)):
            groups = await insforge_client.get_all_protected_groups()
            assert len(groups) == 2
            assert groups[0].group_id == -1001
            assert groups[1].title == "G2"


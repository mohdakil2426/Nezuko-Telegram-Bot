"""Unit tests for the InsForge-backed verification logger."""

from unittest.mock import AsyncMock, patch

import pytest


class TestVerificationLogger:
    """Tests for apps/bot/database/verification_logger.py."""

    @pytest.mark.asyncio
    async def test_log_verification_calls_insforge_post(self):
        """log_verification calls insforge_client._post with correct table and payload."""
        from apps.bot.database.verification_logger import log_verification
        from apps.bot.core import insforge_client

        with patch.object(insforge_client, "_post", new=AsyncMock(return_value=[])) as mock_post:
            await log_verification(
                user_id=123456,
                group_id=-100123,
                channel_id=-100456,
                status="verified",
                latency_ms=45,
                cached=False,
            )

            mock_post.assert_awaited_once()
            call_args = mock_post.call_args
            # First positional arg is the table name
            assert call_args[0][0] == "verification_log"
            record = call_args[0][1][0]
            assert record["user_id"] == 123456
            assert record["group_id"] == -100123
            assert record["status"] == "verified"
            assert record["latency_ms"] == 45
            assert record["cached"] is False

    @pytest.mark.asyncio
    async def test_log_verification_handles_insforge_error(self):
        """log_verification swallows errors — verification must never fail due to analytics."""
        from apps.bot.database.verification_logger import log_verification
        from apps.bot.core import insforge_client

        with patch.object(
            insforge_client, "_post", new=AsyncMock(side_effect=OSError("network error"))
        ):
            # Must NOT raise
            await log_verification(
                user_id=111,
                group_id=-100,
                channel_id=-200,
                status="error",
                latency_ms=None,
                cached=False,
                error_type="TelegramError",
            )

    @pytest.mark.asyncio
    async def test_log_verification_valid_statuses_all_accepted(self):
        """Each valid status value is forwarded to InsForge without error."""
        from apps.bot.database.verification_logger import log_verification
        from apps.bot.core import insforge_client

        for status in ("verified", "restricted", "error"):
            with patch.object(
                insforge_client, "_post", new=AsyncMock(return_value=[])
            ) as mock_post:
                await log_verification(
                    user_id=1,
                    group_id=-1,
                    channel_id=-2,
                    status=status,
                    latency_ms=10,
                    cached=False,
                )
                mock_post.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_log_verification_async_creates_task(self):
        """log_verification_async returns an asyncio.Task and it completes successfully."""
        import asyncio
        from apps.bot.database.verification_logger import log_verification_async
        from apps.bot.core import insforge_client

        with patch.object(insforge_client, "_post", new=AsyncMock(return_value=[])):
            task = log_verification_async(
                user_id=9999,
                group_id=-100999,
                channel_id=-200999,
                status="verified",
                latency_ms=12,
                cached=True,
            )
            assert isinstance(task, asyncio.Task)
            await task  # Must complete without error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

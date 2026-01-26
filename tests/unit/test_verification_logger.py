"""Unit tests for verification logger."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestVerificationLogger:
    """Test cases for bot/database/verification_logger.py."""

    @pytest.fixture
    def mock_db_connection(self):
        """Mock database connection."""
        mock_conn = MagicMock()
        mock_conn.execute = AsyncMock()
        mock_conn.commit = AsyncMock()
        return mock_conn

    @pytest.mark.asyncio
    async def test_log_verification_success(self, mock_db_connection):
        """Test successful verification logging."""
        from bot.database.verification_logger import log_verification

        with patch("bot.database.verification_logger._get_connection") as mock_get_conn:
            mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_db_connection)
            mock_get_conn.return_value.__aexit__ = AsyncMock(return_value=None)

            await log_verification(
                user_id=123456,
                group_id=-100123,
                channel_id=-100456,
                status="verified",
                latency_ms=45,
                cached=False,
            )

            # Verify execute was called
            mock_db_connection.execute.assert_called()

    @pytest.mark.asyncio
    async def test_log_verification_handles_db_error(self, mock_db_connection):
        """Test that DB errors don't crash the logger."""
        from bot.database.verification_logger import log_verification

        with patch("bot.database.verification_logger._get_connection") as mock_get_conn:
            mock_get_conn.return_value.__aenter__ = AsyncMock(
                side_effect=Exception("DB connection failed")
            )
            mock_get_conn.return_value.__aexit__ = AsyncMock(return_value=None)

            # Should not raise
            await log_verification(
                user_id=123456,
                group_id=-100123,
                channel_id=-100456,
                status="error",
                latency_ms=100,
                cached=False,
            )


class TestVerificationLoggerValidation:
    """Test validation in verification logger."""

    @pytest.mark.asyncio
    async def test_log_verification_validates_status(self):
        """Test that only valid statuses are accepted."""
        from bot.database.verification_logger import log_verification

        # Valid statuses should work
        valid_statuses = ["verified", "restricted", "error"]
        for status in valid_statuses:
            with patch("bot.database.verification_logger._get_connection") as mock_get_conn:
                mock_conn = MagicMock()
                mock_conn.execute = AsyncMock()
                mock_conn.commit = AsyncMock()
                mock_get_conn.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
                mock_get_conn.return_value.__aexit__ = AsyncMock(return_value=None)

                await log_verification(
                    user_id=1,
                    group_id=-1,
                    channel_id=-2,
                    status=status,
                    latency_ms=10,
                    cached=False,
                )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

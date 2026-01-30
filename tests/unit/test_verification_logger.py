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
        from apps.bot.database.verification_logger import log_verification

        with patch("apps.bot.database.verification_logger.get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)

            await log_verification(
                user_id=123456,
                group_id=-100123,
                channel_id=-100456,
                status="verified",
                latency_ms=45,
                cached=False,
            )

            # Verify add was called on session
            mock_session.add.assert_called()

    @pytest.mark.asyncio
    async def test_log_verification_handles_db_error(self, mock_db_connection):
        """Test that DB errors don't crash the logger."""
        from apps.bot.database.verification_logger import log_verification

        with patch("apps.bot.database.verification_logger.get_session") as mock_get_session:
            # Mock session context manager to raise OSError (which is caught)
            mock_get_session.return_value.__aenter__ = AsyncMock(
                side_effect=OSError("DB connection failed")
            )
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)

            # Should not raise exception
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
        from apps.bot.database.verification_logger import log_verification

        # Valid statuses should work
        valid_statuses = ["verified", "restricted", "error"]
        for status in valid_statuses:
            with patch("apps.bot.database.verification_logger.get_session") as mock_get_session:
                mock_session = MagicMock()
                mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_session)
                mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)

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

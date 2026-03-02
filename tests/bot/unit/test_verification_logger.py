"""Unit tests."""
from unittest.mock import AsyncMock, patch
import pytest

class TestVerificationLogger:
    @pytest.mark.asyncio
    async def test_log_verification_calls_insforge_post(self):
        from apps.bot.database.verification_logger import log_verification
        from apps.bot.core import insforge_client
        with patch.object(insforge_client, "post_records", new=AsyncMock(return_value=[])) as mock_post:
            await log_verification(user_id=1, group_id=2, channel_id=3, status="verified")
            mock_post.assert_awaited_once()

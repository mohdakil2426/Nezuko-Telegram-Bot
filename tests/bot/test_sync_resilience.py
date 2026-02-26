"""
Resilience and scheduling tests for member sync service.

Uses freezegun to mock time for verifying sync timestamps and job intervals.
"""

import pytest
from freezegun import freeze_time
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, UTC, timedelta

from apps.bot.services.member_sync import sync_member_counts, schedule_member_sync


@pytest.mark.asyncio
async def test_sync_member_counts_batch_logic():
    """Verify that sync_member_counts collects updates and calls bulk_update once."""
    mock_context = MagicMock()
    # Return different counts for different chats to verify data flow
    counts = {1: 100, 2: 200}
    mock_context.bot.get_chat_member_count = AsyncMock(side_effect=lambda cid: counts.get(cid, 0))

    mock_groups = [
        MagicMock(group_id=1, owner_id=10, title="Group 1"),
        MagicMock(group_id=2, owner_id=10, title="Group 2"),
    ]

    # Mock insforge_client methods
    with (
        patch(
            "apps.bot.core.insforge_client.get_all_protected_groups", AsyncMock(return_value=mock_groups)
        ),
        patch("apps.bot.core.insforge_client.get_all_enforced_channels", AsyncMock(return_value=[])),
        patch("apps.bot.core.insforge_client.bulk_update_member_counts", AsyncMock()) as mock_bulk,
        patch("apps.bot.services.member_sync.log_api_call_async"),
        patch("apps.bot.services.member_sync.asyncio.sleep", AsyncMock()),
    ):
        await sync_member_counts(mock_context)

        # Should be called exactly once for groups
        assert mock_bulk.call_count == 1
        updates = mock_bulk.call_args[0][0]
        assert len(updates) == 2
        assert updates[0]["group_id"] == 1
        assert updates[0]["member_count"] == 100
        assert updates[1]["group_id"] == 2
        assert updates[1]["member_count"] == 200


@pytest.mark.asyncio
async def test_sync_timestamps_with_freezegun():
    """Verify that sync timestamps match the frozen mock time."""
    mock_context = MagicMock()
    mock_context.bot.get_chat_member_count = AsyncMock(return_value=500)

    mock_groups = [MagicMock(group_id=1, owner_id=10)]
    frozen_time = "2026-05-20T10:00:00Z"

    with freeze_time(frozen_time):
        # In freezegun, datetime.now(UTC) will return the frozen time
        with (
            patch(
                "apps.bot.core.insforge_client.get_all_protected_groups",
                AsyncMock(return_value=mock_groups),
            ),
            patch("apps.bot.core.insforge_client.get_all_enforced_channels", AsyncMock(return_value=[])),
            patch("apps.bot.core.insforge_client.bulk_update_member_counts", AsyncMock()) as mock_bulk,
            patch("apps.bot.services.member_sync.asyncio.sleep", AsyncMock()),
            patch("apps.bot.services.member_sync.log_api_call_async"),
        ):
            await sync_member_counts(mock_context)

            updates = mock_bulk.call_args[0][0]
            # Check timestamp format and value (freezegun uses offset-naive by default 
            # unless we specify tz or use datetime.now(UTC))
            sync_time = updates[0]["last_sync_at"]
            assert "2026-05-20T10:00:00" in sync_time


def test_schedule_member_sync_registration():
    """Verify that schedule_member_sync registers the repeating job with correct interval."""
    mock_app = MagicMock()
    mock_app.job_queue = MagicMock()

    schedule_member_sync(mock_app)

    assert mock_app.job_queue.run_repeating.call_count == 1
    args, kwargs = mock_app.job_queue.run_repeating.call_args
    assert kwargs["interval"] == 900  # SYNC_INTERVAL_SECONDS
    assert kwargs["name"] == "member_sync"
    assert kwargs["first"] == 60

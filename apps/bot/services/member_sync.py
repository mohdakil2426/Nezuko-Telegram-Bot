"""
Member Count Sync Service — InsForge REST backend.

Periodically syncs member/subscriber counts from Telegram API
to protected_groups.member_count and enforced_channels.subscriber_count
via InsForge PATCH calls.

Features:
- Syncs every 15 minutes via PTB JobQueue
- Handles Telegram rate limits (RetryAfter) gracefully
- Per-entity error isolation (one failure doesn't abort the run)
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from telegram.error import RetryAfter, TelegramError
from telegram.ext import Application, ContextTypes

from apps.bot.core import insforge_client
from apps.bot.database.api_call_logger import log_api_call_async

logger = logging.getLogger(__name__)

# Sync interval in seconds (15 minutes)
SYNC_INTERVAL_SECONDS = 900

# 100 ms between Telegram API calls — well under the 30 req/s global limit
INTER_REQUEST_DELAY = 0.1


async def _fetch_group_member_count_data(
    context: ContextTypes.DEFAULT_TYPE, group_id: int, owner_id: int
) -> dict[str, Any] | None:
    """Fetch member count for one protected group from Telegram.

    Args:
        context: Telegram bot context
        group_id: Telegram group chat ID
        owner_id: Group owner ID (required for bulk upsert)

    Returns:
        Data dict for bulk update if succeeded, None otherwise.
    """
    try:
        count = await context.bot.get_chat_member_count(group_id)
        now = datetime.now(UTC).isoformat()
        log_api_call_async(method="getChatMemberCount", chat_id=group_id, success=True)
        await asyncio.sleep(INTER_REQUEST_DELAY)
        return {
            "group_id": group_id,
            "owner_id": owner_id,
            "member_count": count,
            "last_sync_at": now,
            "updated_at": now,
        }

    except RetryAfter as e:
        retry_secs = (
            e.retry_after.total_seconds()
            if isinstance(e.retry_after, timedelta)
            else float(e.retry_after)
        )
        logger.warning("Rate-limited syncing group %s, waiting %.1fs", group_id, retry_secs + 1)
        log_api_call_async(
            method="getChatMemberCount", chat_id=group_id, success=False, error_type="RetryAfter"
        )
        await asyncio.sleep(retry_secs + 1)
        return None

    except TelegramError as e:
        logger.debug("Failed to fetch group count for %s: %s", group_id, e)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=group_id,
            success=False,
            error_type=type(e).__name__,
        )
        return None


async def _fetch_channel_subscriber_count_data(
    context: ContextTypes.DEFAULT_TYPE, channel_id: int
) -> dict[str, Any] | None:
    """Fetch subscriber count for one enforced channel from Telegram.

    Args:
        context: Telegram bot context
        channel_id: Telegram channel ID

    Returns:
        Data dict for bulk update if succeeded, None otherwise.
    """
    try:
        count = await context.bot.get_chat_member_count(channel_id)
        now = datetime.now(UTC).isoformat()
        log_api_call_async(method="getChatMemberCount", chat_id=channel_id, success=True)
        await asyncio.sleep(INTER_REQUEST_DELAY)
        return {
            "channel_id": channel_id,
            "subscriber_count": count,
            "last_sync_at": now,
            "updated_at": now,
        }

    except RetryAfter as e:
        retry_secs = (
            e.retry_after.total_seconds()
            if isinstance(e.retry_after, timedelta)
            else float(e.retry_after)
        )
        logger.warning("Rate-limited syncing channel %s, waiting %.1fs", channel_id, retry_secs + 1)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=channel_id,
            success=False,
            error_type="RetryAfter",
        )
        await asyncio.sleep(retry_secs + 1)
        return None

    except TelegramError as e:
        logger.debug("Failed to fetch channel count for %s: %s", channel_id, e)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=channel_id,
            success=False,
            error_type=type(e).__name__,
        )
        return None


async def sync_member_counts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Sync member/subscriber counts for all groups and channels.

    Called automatically by PTB JobQueue every SYNC_INTERVAL_SECONDS.
    Collects updates and performs bulk DB writes for better performance.

    Args:
        context: Telegram bot context with bot instance
    """
    logger.info("Starting member count sync (batch mode)...")
    start_time = datetime.now(UTC)

    groups_synced = groups_failed = channels_synced = channels_failed = 0
    group_updates = []
    channel_updates = []

    # 1. Collect protected group counts
    try:
        groups = await insforge_client.get_all_protected_groups()
        logger.debug("Fetching member counts for %d groups", len(groups))
        for group in groups:
            data = await _fetch_group_member_count_data(context, group.group_id, group.owner_id)
            if data:
                group_updates.append(data)
                groups_synced += 1
            else:
                groups_failed += 1

        if group_updates:
            await insforge_client.bulk_update_member_counts(group_updates)
            logger.debug("Bulk updated member counts for %d groups", len(group_updates))

    except (httpx.HTTPError, OSError, RuntimeError) as e:
        logger.warning("Failed to sync groups: %s", e)

    # 2. Collect enforced channel counts
    try:
        channels = await insforge_client.get_all_enforced_channels()
        logger.debug("Fetching subscriber counts for %d channels", len(channels))
        for channel in channels:
            data = await _fetch_channel_subscriber_count_data(context, channel.channel_id)
            if data:
                channel_updates.append(data)
                channels_synced += 1
            else:
                channels_failed += 1

        if channel_updates:
            await insforge_client.bulk_update_subscriber_counts(channel_updates)
            logger.debug("Bulk updated subscriber counts for %d channels", len(channel_updates))

    except (httpx.HTTPError, OSError, RuntimeError) as e:
        logger.warning("Failed to sync channels: %s", e)

    elapsed = (datetime.now(UTC) - start_time).total_seconds()
    logger.info(
        "Batch member sync done in %.1fs — groups: %d ok / %d fail; channels: %d ok / %d fail",
        elapsed,
        groups_synced,
        groups_failed,
        channels_synced,
        channels_failed,
    )


def schedule_member_sync(application: Application) -> None:
    """
    Register the member-sync job with the PTB JobQueue.

    Args:
        application: Telegram Application instance (must have job_queue configured)
    """
    if application.job_queue is None:
        logger.warning("JobQueue not configured — member sync disabled")
        return

    application.job_queue.run_repeating(
        callback=sync_member_counts,
        interval=SYNC_INTERVAL_SECONDS,
        first=60,  # First run 60s after startup to let the bot fully initialise
        name="member_sync",
    )
    logger.info(
        "Member sync scheduled: first in 60s, then every %d min",
        SYNC_INTERVAL_SECONDS // 60,
    )

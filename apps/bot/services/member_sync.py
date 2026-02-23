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

from telegram.error import RetryAfter, TelegramError
from telegram.ext import Application, ContextTypes

from apps.bot.core import insforge_client
from apps.bot.database.api_call_logger import log_api_call_async

logger = logging.getLogger(__name__)

# Sync interval in seconds (15 minutes)
SYNC_INTERVAL_SECONDS = 900

# 100 ms between Telegram API calls — well under the 30 req/s global limit
INTER_REQUEST_DELAY = 0.1


async def _sync_group_member_count(context: ContextTypes.DEFAULT_TYPE, group_id: int) -> bool:
    """Fetch and persist member count for one protected group.

    Args:
        context: Telegram bot context
        group_id: Telegram group chat ID

    Returns:
        True if sync succeeded, False otherwise.
    """
    try:
        count = await context.bot.get_chat_member_count(group_id)
        now = datetime.now(UTC).isoformat()
        await insforge_client._patch(  # pylint: disable=protected-access
            "protected_groups",
            {"group_id": f"eq.{group_id}"},
            {"member_count": count, "last_sync_at": now, "updated_at": now},
            prefer="return=minimal",
        )
        log_api_call_async(method="getChatMemberCount", chat_id=group_id, success=True)
        await asyncio.sleep(INTER_REQUEST_DELAY)
        return True

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
        return False

    except TelegramError as e:
        logger.debug("Failed to sync group %s: %s", group_id, e)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=group_id,
            success=False,
            error_type=type(e).__name__,
        )
        return False


async def _sync_channel_subscriber_count(
    context: ContextTypes.DEFAULT_TYPE, channel_id: int
) -> bool:
    """Fetch and persist subscriber count for one enforced channel.

    Args:
        context: Telegram bot context
        channel_id: Telegram channel ID

    Returns:
        True if sync succeeded, False otherwise.
    """
    try:
        count = await context.bot.get_chat_member_count(channel_id)
        now = datetime.now(UTC).isoformat()
        await insforge_client._patch(  # pylint: disable=protected-access
            "enforced_channels",
            {"channel_id": f"eq.{channel_id}"},
            {"subscriber_count": count, "last_sync_at": now, "updated_at": now},
            prefer="return=minimal",
        )
        log_api_call_async(method="getChatMemberCount", chat_id=channel_id, success=True)
        await asyncio.sleep(INTER_REQUEST_DELAY)
        return True

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
        return False

    except TelegramError as e:
        logger.debug("Failed to sync channel %s: %s", channel_id, e)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=channel_id,
            success=False,
            error_type=type(e).__name__,
        )
        return False


async def sync_member_counts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Sync member/subscriber counts for all groups and channels.

    Called automatically by PTB JobQueue every SYNC_INTERVAL_SECONDS.
    Errors on individual entities don't abort the entire run.

    Args:
        context: Telegram bot context with bot instance
    """
    logger.info("Starting member count sync...")
    start_time = datetime.now(UTC)

    groups_synced = groups_failed = channels_synced = channels_failed = 0

    # Sync protected groups
    try:
        groups = await insforge_client.get_all_protected_groups()
        logger.debug("Syncing member counts for %d protected groups", len(groups))
        for group in groups:
            ok = await _sync_group_member_count(context, group.group_id)
            if ok:
                groups_synced += 1
            else:
                groups_failed += 1
    except (OSError, RuntimeError) as e:
        logger.error("Failed to fetch groups for sync: %s", e)

    # Sync enforced channels
    try:
        channels = await insforge_client.get_all_enforced_channels()
        logger.debug("Syncing subscriber counts for %d enforced channels", len(channels))
        for channel in channels:
            ok = await _sync_channel_subscriber_count(context, channel.channel_id)
            if ok:
                channels_synced += 1
            else:
                channels_failed += 1
    except (OSError, RuntimeError) as e:
        logger.error("Failed to fetch channels for sync: %s", e)

    elapsed = (datetime.now(UTC) - start_time).total_seconds()
    logger.info(
        "Member sync done in %.1fs — groups: %d ok / %d fail; channels: %d ok / %d fail",
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

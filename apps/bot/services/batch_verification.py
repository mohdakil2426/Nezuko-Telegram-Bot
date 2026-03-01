"""
Batch verification service for warming the Redis membership cache.

Pre-verifies users in bulk during off-peak hours to improve cache hit
rates and reduce per-message Telegram API calls.

Note: _get_recent_active_users currently returns [] (activity tracking
not yet implemented). Pass explicit user_ids to warm_cache_for_group().
"""

import asyncio
import logging
from datetime import UTC, datetime

import httpx
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core import insforge_client
from apps.bot.core.insforge_client import EnforcedChannel
from apps.bot.services.verification import check_membership

logger = logging.getLogger(__name__)

# Configuration
BATCH_SIZE = 100  # Users per batch
RATE_LIMIT_DELAY = 0.2  # 200 ms → 5 checks/second max


async def _verify_user_channels(
    user_id: int,
    channels: list[EnforcedChannel],
    context: ContextTypes.DEFAULT_TYPE,
) -> bool:
    """Check whether user_id is a member of all required channels.

    Args:
        user_id: Telegram user ID to check.
        channels: List of channels the user must belong to.
        context: Telegram bot context for API calls.

    Returns:
        True if the user is a member of every channel, False otherwise.
    """
    for channel in channels:
        is_member = await check_membership(user_id, channel.channel_id, context)
        if not is_member:
            return False
        await asyncio.sleep(RATE_LIMIT_DELAY)
    return True


async def warm_cache_for_group(
    group_id: int,
    context: ContextTypes.DEFAULT_TYPE,
    user_ids: list[int] | None = None,
) -> dict:
    """
    Pre-verify users for a specific protected group to warm the Redis cache.

    Args:
        group_id: Telegram group ID
        context: Telegram bot context
        user_ids: Explicit list of user IDs to verify.
                  If None, falls back to _get_recent_active_users (returns [] for now).

    Returns:
        Dict with keys: total_users, verified, not_verified, errors, duration_seconds
    """
    start_time = datetime.now(UTC)
    stats: dict = {
        "total_users": 0,
        "verified": 0,
        "not_verified": 0,
        "errors": 0,
        "duration_seconds": 0.0,
    }

    logger.info("Starting cache warm-up for group %s", group_id)

    try:
        # Validate group is protected and enabled
        group = await insforge_client.get_protected_group(group_id)
        if not group or not group.enabled:
            logger.warning("Group %s not protected or disabled", group_id)
            return stats

        channels = await insforge_client.get_group_channels(group_id)
        if not channels:
            logger.warning("No channels linked to group %s", group_id)
            return stats

        # Resolve user list
        if user_ids is None:
            user_ids = await _get_recent_active_users(group_id, context)

        if not user_ids:
            logger.info("No users to verify for group %s", group_id)
            return stats

        stats["total_users"] = len(user_ids)
        logger.info(
            "Verifying %d users across %d channel(s) for group %s",
            len(user_ids),
            len(channels),
            group_id,
        )

        total_batches = (len(user_ids) + BATCH_SIZE - 1) // BATCH_SIZE

        for batch_idx, batch_start in enumerate(range(0, len(user_ids), BATCH_SIZE), start=1):
            batch = user_ids[batch_start : batch_start + BATCH_SIZE]
            logger.info("Processing batch %d/%d (%d users)", batch_idx, total_batches, len(batch))

            for user_id in batch:
                try:
                    all_verified = await _verify_user_channels(user_id, channels, context)
                    if all_verified:
                        stats["verified"] += 1
                    else:
                        stats["not_verified"] += 1

                except (TelegramError, httpx.HTTPError, OSError, RuntimeError) as e:
                    logger.error("Error verifying user %s in group %s: %s", user_id, group_id, e)
                    stats["errors"] += 1

            logger.info(
                "Batch %d done — verified=%d not_verified=%d errors=%d",
                batch_idx,
                stats["verified"],
                stats["not_verified"],
                stats["errors"],
            )

    except (TelegramError, httpx.HTTPError, OSError, RuntimeError) as e:
        logger.error("Fatal error in cache warm-up for group %s: %s", group_id, e)
        stats["errors"] += 1

    finally:
        duration = (datetime.now(UTC) - start_time).total_seconds()
        stats["duration_seconds"] = round(duration, 2)
        rate = stats["total_users"] / duration if duration > 0 else 0.0
        logger.info(
            "Cache warm-up done for group %s — "
            "total=%d verified=%d not_verified=%d errors=%d duration=%.2fs rate=%.2f/s",
            group_id,
            stats["total_users"],
            stats["verified"],
            stats["not_verified"],
            stats["errors"],
            stats["duration_seconds"],
            rate,
        )

    return stats


async def _get_recent_active_users(
    _group_id: int, _context: ContextTypes.DEFAULT_TYPE
) -> list[int]:
    """
    Placeholder: return recently-active user IDs for a group.

    Not yet implemented — requires storing last_message_at per user.
    Pass explicit user_ids to warm_cache_for_group() in the meantime.

    TODO: Implement activity tracking by storing last_message_at per user in the database.
    """
    return []


async def warm_cache_for_all_groups(context: ContextTypes.DEFAULT_TYPE) -> dict:
    """
    Pre-verify users for every protected group.

    Intended as a scheduled off-peak task. Aggregates stats across all groups.

    Args:
        context: Telegram bot context

    Returns:
        Aggregated stats dict.
    """
    logger.info("Starting cache warm-up for ALL protected groups")
    start_time = datetime.now(UTC)

    agg: dict = {
        "total_groups": 0,
        "successful_groups": 0,
        "failed_groups": 0,
        "total_users": 0,
        "verified": 0,
        "not_verified": 0,
        "errors": 0,
        "duration_seconds": 0.0,
    }

    try:
        groups = await insforge_client.get_all_protected_groups()
        agg["total_groups"] = len(groups)
        logger.info("Found %d protected groups to warm", len(groups))

        for group in groups:
            try:
                group_label = group.title or str(group.group_id)
                logger.info("Warming group: %s", group_label)
                stats = await warm_cache_for_group(group.group_id, context)
                agg["total_users"] += stats["total_users"]
                agg["verified"] += stats["verified"]
                agg["not_verified"] += stats["not_verified"]
                agg["errors"] += stats["errors"]
                agg["successful_groups"] += 1
            except TelegramError as e:
                logger.error("Failed to warm group %s: %s", group.group_id, e)
                agg["failed_groups"] += 1

    except (TelegramError, httpx.HTTPError, OSError, RuntimeError) as e:
        logger.error("Fatal error in all-groups warm-up: %s", e)

    finally:
        duration = (datetime.now(UTC) - start_time).total_seconds()
        agg["duration_seconds"] = round(duration, 2)
        logger.info(
            "Global cache warm-up done — "
            "groups=%d (ok=%d fail=%d) users=%d verified=%d not_verified=%d "
            "errors=%d duration=%.2fs",
            agg["total_groups"],
            agg["successful_groups"],
            agg["failed_groups"],
            agg["total_users"],
            agg["verified"],
            agg["not_verified"],
            agg["errors"],
            agg["duration_seconds"],
        )

    return agg

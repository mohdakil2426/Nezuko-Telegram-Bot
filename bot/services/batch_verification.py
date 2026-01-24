"""
Batch verification service for warming cache in large groups.

Provides functions to pre-verify users in bulk to improve cache hit rates
and reduce API calls during peak activity periods.
"""
import asyncio
import logging
from typing import List, cast
from datetime import datetime, timezone
from telegram.ext import ContextTypes
from telegram.error import TelegramError

from bot.database.crud import (
    get_group_channels,
    get_protected_group,
    get_all_protected_groups
)
from bot.services.verification import check_membership
from bot.core.database import get_session

logger = logging.getLogger(__name__)

# Configuration
BATCH_SIZE = 100  # Users per batch
RATE_LIMIT_DELAY = 0.2  # 5 verifications/second (200ms delay)
ACTIVE_USER_DAYS = 30  # Consider users active if messaged in last 30 days


# pylint: disable=too-many-locals, too-many-branches
async def warm_cache_for_group(
    group_id: int,
    context: ContextTypes.DEFAULT_TYPE,
    user_ids: List[int] | None = None
) -> dict:
    """
    Warm cache for a specific protected group.

    This function pre-verifies users in batches to populate the Redis cache,
    reducing API load during peak activity. Should be run during off-peak hours.

    Args:
        group_id: Telegram group ID
        context: Telegram context for API calls
        user_ids: Optional list of user IDs to verify.

    Returns:
        Dict with verification stats
    """
    start_time = datetime.now(timezone.utc)
    stats = {
        "total_users": 0,
        "verified": 0,
        "not_verified": 0,
        "errors": 0,
        "duration_seconds": 0.0
    }

    logger.info("Starting cache warm-up for group %s", group_id)

    try:
        # Get group channels from database
        async with get_session() as session:
            group = await get_protected_group(session, group_id)
            if not group or not group.enabled:
                logger.warning("Group %s not protected or disabled", group_id)
                return stats

            channels = await get_group_channels(session, group_id)
            if not channels:
                logger.warning("No channels linked to group %s", group_id)
                return stats

        # If user_ids not provided, get from activity (placeholder)
        if user_ids is None:
            user_ids = await _get_recent_active_users(group_id, context)

        if not user_ids:
            logger.info("No users to verify")
            return stats

        stats["total_users"] = len(user_ids)
        logger.info(
            "Verifying %d users across %d channel(s)",
            len(user_ids), len(channels)
        )

        # Process users in batches
        for batch_start in range(0, len(user_ids), BATCH_SIZE):
            batch = user_ids[batch_start:batch_start + BATCH_SIZE]
            batch_num = (batch_start // BATCH_SIZE) + 1
            total_batches = (len(user_ids) + BATCH_SIZE - 1) // BATCH_SIZE

            logger.info(
                "Processing batch %d/%d (%d users)",
                batch_num, total_batches, len(batch)
            )

            # Verify each user in the batch
            for user_id in batch:
                try:
                    # Check membership in all channels
                    all_verified = True
                    for channel in channels:
                        is_member = await check_membership(
                            user_id,
                            cast(int, channel.channel_id),
                            context
                        )
                        if not is_member:
                            all_verified = False
                            break

                        # Rate limiting: 5 verifications/second
                        await asyncio.sleep(RATE_LIMIT_DELAY)

                    if all_verified:
                        stats["verified"] += 1
                    else:
                        stats["not_verified"] += 1

                except TelegramError as e:
                    logger.error("Error verifying user %s: %s", user_id, e)
                    stats["errors"] += 1

            # Log batch progress
            logger.info(
                "Batch %d complete: verified=%d, not_verified=%d, errors=%d",
                batch_num, stats['verified'], stats['not_verified'], stats['errors']
            )

    except TelegramError as e:
        logger.error("Fatal error in cache warm-up: %s", e)
        stats["errors"] += 1

    finally:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        stats["duration_seconds"] = round(duration, 2)

        rate = stats['total_users'] / duration if duration > 0 else 0
        logger.info(
            "Cache warm-up complete for group %s: "
            "total=%d, verified=%d, not_verified=%d, errors=%d, duration=%.2fs, rate=%.2f/s",
            group_id, stats['total_users'], stats['verified'],
            stats['not_verified'], stats['errors'], stats['duration_seconds'], rate
        )

    return stats


async def _get_recent_active_users(
    _group_id: int,
    _context: ContextTypes.DEFAULT_TYPE
) -> List[int]:
    """
    Get list of recent active users from a group.

    Note: This is a placeholder implementation. In production, you would:
    1. Store user activity in database (last_message_at column)
    2. Query database for active users

    Args:
        _group_id: Telegram group ID (unused, for future implementation)
        _context: Telegram context (unused, for future implementation)

    Returns:
        List of user IDs
    """
    logger.warning(
        "Activity tracking not implemented. "
        "Pass explicit user_ids to warm_cache_for_group() for now."
    )

    # Activity tracking to be implemented:
    # - Adding last_message_at column to database
    # - Storing user activity in message handler
    # - Querying active users here

    return []


async def warm_cache_for_all_groups(
    context: ContextTypes.DEFAULT_TYPE
) -> dict:
    """
    Warm cache for all protected groups.

    Should be run as a scheduled task during off-peak hours.

    Args:
        context: Telegram context for API calls

    Returns:
        Dict with aggregated stats for all groups
    """
    logger.info("Starting cache warm-up for ALL protected groups")

    aggregated_stats = {
        "total_groups": 0,
        "successful_groups": 0,
        "failed_groups": 0,
        "total_users": 0,
        "verified": 0,
        "not_verified": 0,
        "errors": 0,
        "duration_seconds": 0.0
    }

    start_time = datetime.now(timezone.utc)

    try:
        async with get_session() as session:
            groups = await get_all_protected_groups(session)

        aggregated_stats["total_groups"] = len(groups)
        logger.info("Found %d protected groups", len(groups))

        for group in groups:
            try:
                group_name = group.title or str(group.group_id)
                logger.info("Processing group: %s", group_name)
                stats = await warm_cache_for_group(cast(int, group.group_id), context)

                # Aggregate stats
                aggregated_stats["total_users"] += stats["total_users"]
                aggregated_stats["verified"] += stats["verified"]
                aggregated_stats["not_verified"] += stats["not_verified"]
                aggregated_stats["errors"] += stats["errors"]
                aggregated_stats["successful_groups"] += 1

            except TelegramError as e:
                logger.error("Failed to warm cache for group %s: %s", group.group_id, e)
                aggregated_stats["failed_groups"] += 1

    except TelegramError as e:
        logger.error("Fatal error warming cache for all groups: %s", e)

    finally:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        aggregated_stats["duration_seconds"] = round(duration, 2)

        logger.info(
            "Global cache warm-up complete: "
            "groups=%d (success=%d, failed=%d), users=%d, "
            "verified=%d, not_verified=%d, errors=%d, duration=%.2fs",
            aggregated_stats['total_groups'],
            aggregated_stats['successful_groups'],
            aggregated_stats['failed_groups'],
            aggregated_stats['total_users'],
            aggregated_stats['verified'],
            aggregated_stats['not_verified'],
            aggregated_stats['errors'],
            aggregated_stats['duration_seconds']
        )

    return aggregated_stats

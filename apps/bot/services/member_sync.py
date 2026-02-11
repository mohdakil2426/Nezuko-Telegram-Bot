"""
Member Count Sync Service.

Periodically synchronizes member/subscriber counts from Telegram API
to keep dashboard analytics up-to-date.

Features:
- Syncs every 15 minutes
- Handles rate limits gracefully
- Non-blocking async operations
- Per-entity error isolation
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from telegram.error import RetryAfter, TelegramError
from telegram.ext import Application, ContextTypes

from apps.bot.core.database import get_session
from apps.bot.database.api_call_logger import log_api_call_async
from apps.bot.database.models import EnforcedChannel, ProtectedGroup

logger = logging.getLogger(__name__)

# Sync interval in seconds (15 minutes)
SYNC_INTERVAL_SECONDS = 900

# Rate limiting: max 30 requests per second to respect Telegram's limits
# We add a small delay between each call to stay well under the limit
INTER_REQUEST_DELAY = 0.1  # 100ms between requests


async def get_all_protected_groups_for_sync(enabled_only: bool = True) -> list[ProtectedGroup]:
    """Get all protected groups for member count sync."""
    async with get_session() as session:
        query = select(ProtectedGroup)
        if enabled_only:
            query = query.where(ProtectedGroup.enabled.is_(True))
        result = await session.execute(query)
        return list(result.scalars().all())


async def get_all_enforced_channels_for_sync() -> list[EnforcedChannel]:
    """Get all enforced channels for subscriber count sync."""
    async with get_session() as session:
        result = await session.execute(select(EnforcedChannel))
        return list(result.scalars().all())


async def _sync_entity_count(
    context: ContextTypes.DEFAULT_TYPE,
    entity_id: int,
    model_class: type,
    id_column: str,
    count_column: str,
    entity_label: str,
) -> bool:
    """Sync a single entity's member/subscriber count from Telegram API.

    Args:
        context: Telegram bot context with bot instance
        entity_id: Telegram chat ID of the entity
        model_class: SQLAlchemy model class (ProtectedGroup or EnforcedChannel)
        id_column: Name of the ID column on the model
        count_column: Name of the count column to update
        entity_label: Human-readable label for logging ("group" or "channel")

    Returns:
        True if sync succeeded, False if it failed
    """
    try:
        count = await context.bot.get_chat_member_count(entity_id)

        async with get_session() as session:
            result = await session.execute(
                select(model_class).where(
                    getattr(model_class, id_column) == entity_id
                )
            )
            db_entity = result.scalar_one_or_none()
            if db_entity:
                setattr(db_entity, count_column, count)
                db_entity.last_sync_at = datetime.now(UTC)
                await session.commit()

        log_api_call_async(
            method="getChatMemberCount",
            chat_id=entity_id,
            success=True,
        )
        await asyncio.sleep(INTER_REQUEST_DELAY)
        return True

    except RetryAfter as e:
        retry_seconds = (
            e.retry_after.total_seconds()
            if isinstance(e.retry_after, timedelta)
            else float(e.retry_after)
        )
        retry_wait = retry_seconds + 1.0
        logger.warning(
            "Rate limit syncing %s %s, waiting %.1fs",
            entity_label,
            entity_id,
            retry_wait,
        )
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=entity_id,
            success=False,
            error_type="RetryAfter",
        )
        await asyncio.sleep(retry_wait)
        return False

    except TelegramError as e:
        logger.debug("Failed to sync %s %s: %s", entity_label, entity_id, e)
        log_api_call_async(
            method="getChatMemberCount",
            chat_id=entity_id,
            success=False,
            error_type=type(e).__name__,
        )
        return False


async def sync_member_counts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Sync member/subscriber counts from Telegram API.

    This job runs periodically to keep the dashboard stats current.
    Errors on individual entities don't abort the entire sync.

    Args:
        context: Telegram bot context with bot instance
    """
    logger.info("Starting member count sync...")
    start_time = datetime.now(UTC)

    groups_synced = 0
    groups_failed = 0
    channels_synced = 0
    channels_failed = 0

    # Sync protected groups
    try:
        groups = await get_all_protected_groups_for_sync()
        logger.debug("Syncing %d protected groups", len(groups))

        for group in groups:
            group_id: int = group.group_id  # type: ignore[assignment]
            success = await _sync_entity_count(
                context, group_id, ProtectedGroup, "group_id", "member_count", "group"
            )
            if success:
                groups_synced += 1
            else:
                groups_failed += 1

    except (OSError, RuntimeError) as e:
        logger.error("Failed to fetch groups for sync: %s", e)

    # Sync enforced channels
    try:
        channels = await get_all_enforced_channels_for_sync()
        logger.debug("Syncing %d enforced channels", len(channels))

        for channel in channels:
            channel_id: int = channel.channel_id  # type: ignore[assignment]
            success = await _sync_entity_count(
                context, channel_id, EnforcedChannel, "channel_id", "subscriber_count", "channel"
            )
            if success:
                channels_synced += 1
            else:
                channels_failed += 1

    except (OSError, RuntimeError) as e:
        logger.error("Failed to fetch channels for sync: %s", e)

    elapsed = (datetime.now(UTC) - start_time).total_seconds()
    logger.info(
        "Member sync completed in %.1fs: %d groups synced, %d failed; %d channels synced, %d failed",
        elapsed,
        groups_synced,
        groups_failed,
        channels_synced,
        channels_failed,
    )


def schedule_member_sync(application: Application) -> None:
    """
    Schedule periodic member count sync job.

    Args:
        application: Telegram Application instance with job_queue
    """
    if application.job_queue is None:
        logger.warning("Job queue not available - member sync disabled")
        return

    # Schedule repeating job
    application.job_queue.run_repeating(
        callback=sync_member_counts,
        interval=SYNC_INTERVAL_SECONDS,
        first=60,  # First run after 1 minute (allow bot to fully initialize)
        name="member_sync",
    )

    logger.info(
        "Member sync scheduled: first run in 60s, then every %d minutes",
        SYNC_INTERVAL_SECONDS // 60,
    )

"""
Batch verification service for warming cache in large groups.

Provides functions to pre-verify users in bulk to improve cache hit rates
and reduce API calls during peak activity periods.
"""
import asyncio
import logging
from typing import List
from datetime import datetime, timedelta
from telegram.ext import ContextTypes

from bot.database.crud import get_group_channels, get_protected_group
from bot.database.models import ProtectedGroup
from bot.services.verification import check_membership
from bot.core.database import get_session

logger = logging.getLogger(__name__)

# Configuration
BATCH_SIZE = 100  # Users per batch
RATE_LIMIT_DELAY = 0.2  # 5 verifications/second (200ms delay)
ACTIVE_USER_DAYS = 30  # Consider users active if messaged in last 30 days


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
        user_ids: Optional list of user IDs to verify. If None, verifies recent active users.
    
    Returns:
        Dict with verification stats:
        {
            "total_users": int,
            "verified": int,
            "not_verified": int,
            "errors": int,
            "duration_seconds": float
        }
    """
    start_time = datetime.utcnow()
    stats = {
        "total_users": 0,
        "verified": 0,
        "not_verified": 0,
        "errors": 0,
        "duration_seconds": 0.0
    }
    
    logger.info(f"🔄 Starting cache warm-up for group {group_id}")
    
    try:
        # Get group channels from database
        async with get_session() as session:
            group = await get_protected_group(session, group_id)
            if not group or not group.enabled:
                logger.warning(f"Group {group_id} not protected or disabled")
                return stats
            
            channels = await get_group_channels(session, group_id)
            if not channels:
                logger.warning(f"No channels linked to group {group_id}")
                return stats
        
        # If user_ids not provided, get from Telegram API
        if user_ids is None:
            user_ids = await _get_recent_active_users(group_id, context)
        
        if not user_ids:
            logger.info("No users to verify")
            return stats
        
        stats["total_users"] = len(user_ids)
        logger.info(f"📋 Verifying {len(user_ids)} users across {len(channels)} channel(s)")
        
        # Process users in batches
        for batch_start in range(0, len(user_ids), BATCH_SIZE):
            batch = user_ids[batch_start:batch_start + BATCH_SIZE]
            batch_num = (batch_start // BATCH_SIZE) + 1
            total_batches = (len(user_ids) + BATCH_SIZE - 1) // BATCH_SIZE
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} users)")
            
            # Verify each user in the batch
            for user_id in batch:
                try:
                    # Check membership in all channels
                    all_verified = True
                    for channel in channels:
                        is_member = await check_membership(
                            user_id,
                            channel.channel_id,
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
                
                except Exception as e:
                    logger.error(f"Error verifying user {user_id}: {e}")
                    stats["errors"] += 1
            
            # Log batch progress
            logger.info(
                f"✅ Batch {batch_num} complete: "
                f"{stats['verified']} verified, "
                f"{stats['not_verified']} not verified, "
                f"{stats['errors']} errors"
            )
    
    except Exception as e:
        logger.error(f"Fatal error in cache warm-up: {e}")
        stats["errors"] += 1
    
    finally:
        duration = (datetime.utcnow() - start_time).total_seconds()
        stats["duration_seconds"] = round(duration, 2)
        
        logger.info(
            f"🏁 Cache warm-up complete for group {group_id}:\n"
            f"  Total Users: {stats['total_users']}\n"
            f"  Verified: {stats['verified']}\n"
            f"  Not Verified: {stats['not_verified']}\n"
            f"  Errors: {stats['errors']}\n"
            f"  Duration: {stats['duration_seconds']}s\n"
            f"  Rate: {stats['total_users'] / duration:.2f} users/sec" if duration > 0 else ""
        )
    
    return stats


async def _get_recent_active_users(
    group_id: int,
    context: ContextTypes.DEFAULT_TYPE
) -> List[int]:
    """
    Get list of recent active users from a group.
    
    Note: This is a simplified implementation. In production, you would:
    1. Store user activity in database (last_message_at column)
    2. Query database for active users
    3. Or maintain an activity log
    
    For now, this returns an empty list and logs a note.
    
    Args:
        group_id: Telegram group ID
        context: Telegram context
    
    Returns:
        List of user IDs
    """
    logger.warning(
        f"⚠️  Activity tracking not implemented. "
        f"Pass explicit user_ids to warm_cache_for_group() for now."
    )
    
    # TODO (Phase 3.1.3): Implement activity tracking
    # This would require:
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
    logger.info("🌐 Starting cache warm-up for ALL protected groups")
    
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
    
    start_time = datetime.utcnow()
    
    try:
        from bot.database.crud import get_all_protected_groups
        
        async with get_session() as session:
            groups = await get_all_protected_groups(session)
        
        aggregated_stats["total_groups"] = len(groups)
        logger.info(f"📊 Found {len(groups)} protected groups")
        
        for group in groups:
            try:
                logger.info(f"Processing group: {group.title or group.group_id}")
                stats = await warm_cache_for_group(group.group_id, context)
                
                # Aggregate stats
                aggregated_stats["total_users"] += stats["total_users"]
                aggregated_stats["verified"] += stats["verified"]
                aggregated_stats["not_verified"] += stats["not_verified"]
                aggregated_stats["errors"] += stats["errors"]
                aggregated_stats["successful_groups"] += 1
            
            except Exception as e:
                logger.error(f"Failed to warm cache for group {group.group_id}: {e}")
                aggregated_stats["failed_groups"] += 1
    
    except Exception as e:
        logger.error(f"Fatal error warming cache for all groups: {e}")
    
    finally:
        duration = (datetime.utcnow() - start_time).total_seconds()
        aggregated_stats["duration_seconds"] = round(duration, 2)
        
        logger.info(
            f"🏁 Global cache warm-up complete:\n"
            f"  Groups: {aggregated_stats['total_groups']} "
            f"({aggregated_stats['successful_groups']} success, {aggregated_stats['failed_groups']} failed)\n"
            f"  Total Users: {aggregated_stats['total_users']}\n"
            f"  Verified: {aggregated_stats['verified']}\n"
            f"  Not Verified: {aggregated_stats['not_verified']}\n"
            f"  Errors: {aggregated_stats['errors']}\n"
            f"  Duration: {aggregated_stats['duration_seconds']}s"
        )
    
    return aggregated_stats

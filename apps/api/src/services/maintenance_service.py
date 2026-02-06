"""Maintenance service for data retention and storage management.

Provides functions to clean up old log data and get storage statistics
for the Nezuko Admin API dashboard.
"""

from datetime import UTC, datetime, timedelta
from typing import TypedDict

import structlog
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.api_call_log import ApiCallLog
from src.models.verification_log import VerificationLog

logger = structlog.get_logger(__name__)


class StorageStats(TypedDict):
    """Storage statistics for analytics tables."""

    api_call_log_count: int
    verification_log_count: int
    estimated_size_mb: float
    oldest_api_call_log: str | None
    oldest_verification_log: str | None


class CleanupResult(TypedDict):
    """Result of cleanup operations."""

    api_call_logs_deleted: int
    verification_logs_deleted: int
    total_deleted: int


async def cleanup_old_api_call_logs(
    session: AsyncSession,
    days_to_keep: int = 90,
) -> int:
    """Delete API call log records older than the specified cutoff date.

    Args:
        session: Database session.
        days_to_keep: Number of days to retain (default: 90).

    Returns:
        Number of deleted records.
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=days_to_keep)

    # Count before delete for accurate count (SQLite doesn't return rowcount reliably)
    count_result = await session.execute(
        select(func.count(ApiCallLog.id)).where(ApiCallLog.timestamp < cutoff_date)
    )
    count_to_delete = count_result.scalar() or 0

    if count_to_delete > 0:
        await session.execute(delete(ApiCallLog).where(ApiCallLog.timestamp < cutoff_date))

    logger.info(
        "cleanup_old_api_call_logs_complete",
        deleted_count=count_to_delete,
        days_to_keep=days_to_keep,
        cutoff_date=cutoff_date.isoformat(),
    )

    return count_to_delete


async def cleanup_old_verification_logs(
    session: AsyncSession,
    days_to_keep: int = 90,
) -> int:
    """Delete verification log records older than the specified cutoff date.

    Args:
        session: Database session.
        days_to_keep: Number of days to retain (default: 90).

    Returns:
        Number of deleted records.
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=days_to_keep)

    # Count before delete for accurate count (SQLite doesn't return rowcount reliably)
    count_result = await session.execute(
        select(func.count(VerificationLog.id)).where(VerificationLog.timestamp < cutoff_date)
    )
    count_to_delete = count_result.scalar() or 0

    if count_to_delete > 0:
        await session.execute(
            delete(VerificationLog).where(VerificationLog.timestamp < cutoff_date)
        )

    logger.info(
        "cleanup_old_verification_logs_complete",
        deleted_count=count_to_delete,
        days_to_keep=days_to_keep,
        cutoff_date=cutoff_date.isoformat(),
    )

    return count_to_delete


async def run_full_cleanup(
    session: AsyncSession,
    days_to_keep: int = 90,
) -> CleanupResult:
    """Run full cleanup of all old log data.

    Args:
        session: Database session.
        days_to_keep: Number of days to retain (default: 90).

    Returns:
        CleanupResult with counts of deleted records.
    """
    api_deleted = await cleanup_old_api_call_logs(session, days_to_keep)
    verification_deleted = await cleanup_old_verification_logs(session, days_to_keep)

    await session.commit()

    return CleanupResult(
        api_call_logs_deleted=api_deleted,
        verification_logs_deleted=verification_deleted,
        total_deleted=api_deleted + verification_deleted,
    )


async def get_storage_stats(session: AsyncSession) -> StorageStats:
    """Get storage statistics for analytics tables.

    Args:
        session: Database session.

    Returns:
        StorageStats with record counts and estimated storage size.
    """
    # Count API call logs
    api_count_result = await session.execute(select(func.count(ApiCallLog.id)))
    api_count = api_count_result.scalar() or 0

    # Count verification logs
    verification_count_result = await session.execute(select(func.count(VerificationLog.id)))
    verification_count = verification_count_result.scalar() or 0

    # Get oldest API call log timestamp
    oldest_api_result = await session.execute(select(func.min(ApiCallLog.timestamp)))
    oldest_api = oldest_api_result.scalar()

    # Get oldest verification log timestamp
    oldest_verification_result = await session.execute(select(func.min(VerificationLog.timestamp)))
    oldest_verification = oldest_verification_result.scalar()

    # Estimate storage size (rough estimate: ~100 bytes per record)
    estimated_bytes = (api_count + verification_count) * 100
    estimated_mb = round(estimated_bytes / (1024 * 1024), 2)

    return StorageStats(
        api_call_log_count=api_count,
        verification_log_count=verification_count,
        estimated_size_mb=estimated_mb,
        oldest_api_call_log=oldest_api.isoformat() if oldest_api else None,
        oldest_verification_log=(oldest_verification.isoformat() if oldest_verification else None),
    )

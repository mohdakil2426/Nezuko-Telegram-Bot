"""Data retention cleanup jobs using APScheduler.

This module defines scheduled background tasks for data retention policies:
- Delete old verification logs (>90 days)
- Delete old API call logs (>30 days)

Runs via APScheduler with proper error handling and logging.
"""

from datetime import UTC, datetime, timedelta
from typing import cast

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import CursorResult, delete
from sqlalchemy.exc import SQLAlchemyError

from src.core.database import async_session_factory
from src.models.api_call_log import ApiCallLog
from src.models.verification_log import VerificationLog

logger = structlog.get_logger(__name__)


async def cleanup_verification_logs() -> None:
    """Delete verification logs older than 90 days.

    Runs daily at 2:00 AM UTC. Removes old verification logs to maintain
    database performance and comply with data retention policies.
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=90)

    try:
        async with async_session_factory() as session:
            result = cast(
                CursorResult,
                await session.execute(
                    delete(VerificationLog).where(VerificationLog.timestamp < cutoff_date)
                ),
            )
            await session.commit()

            deleted_count = result.rowcount
            logger.info(
                "verification_logs_cleanup_completed",
                deleted_count=deleted_count,
                cutoff_date=cutoff_date.isoformat(),
            )
    except (SQLAlchemyError, OSError) as e:
        logger.error(
            "verification_logs_cleanup_failed",
            error=str(e),
            cutoff_date=cutoff_date.isoformat(),
        )


async def cleanup_api_call_logs() -> None:
    """Delete API call logs older than 30 days.

    Runs weekly on Sunday at 4:00 AM UTC. Removes old API call logs while
    keeping recent data for analytics and debugging.
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=30)

    try:
        async with async_session_factory() as session:
            result = cast(
                CursorResult,
                await session.execute(delete(ApiCallLog).where(ApiCallLog.timestamp < cutoff_date)),
            )
            await session.commit()

            deleted_count = result.rowcount
            logger.info(
                "api_call_logs_cleanup_completed",
                deleted_count=deleted_count,
                cutoff_date=cutoff_date.isoformat(),
            )
    except (SQLAlchemyError, OSError) as e:
        logger.error(
            "api_call_logs_cleanup_failed",
            error=str(e),
            cutoff_date=cutoff_date.isoformat(),
        )


def setup_scheduler() -> AsyncIOScheduler:
    """Initialize and configure APScheduler with cleanup jobs.

    Returns:
        AsyncIOScheduler: Configured scheduler instance (not started).

    Scheduled Jobs:
        - cleanup_verification_logs: Daily at 2:00 AM UTC
        - cleanup_api_call_logs: Weekly (Sunday) at 4:00 AM UTC
    """
    scheduler = AsyncIOScheduler(timezone="UTC")

    # Daily at 2:00 AM UTC - Delete verification logs >90 days
    scheduler.add_job(
        cleanup_verification_logs,
        trigger="cron",
        hour=2,
        minute=0,
        id="cleanup_verification_logs",
        name="Cleanup Verification Logs (>90 days)",
        replace_existing=True,
    )

    # Weekly on Sunday at 4:00 AM UTC - Delete API call logs >30 days
    scheduler.add_job(
        cleanup_api_call_logs,
        trigger="cron",
        day_of_week="sun",
        hour=4,
        minute=0,
        id="cleanup_api_call_logs",
        name="Cleanup API Call Logs (>30 days)",
        replace_existing=True,
    )

    logger.info(
        "scheduler_configured",
        jobs=[
            "cleanup_verification_logs (daily 2am)",
            "cleanup_api_call_logs (weekly sun 4am)",
        ],
    )

    return scheduler

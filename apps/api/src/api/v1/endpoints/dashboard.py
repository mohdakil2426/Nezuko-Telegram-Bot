"""Dashboard statistics and activity endpoints."""

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.cache import Cache
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.models.bot import EnforcedChannel, ProtectedGroup
from src.models.verification_log import VerificationLog
from src.schemas.base import SuccessResponse
from src.schemas.dashboard import ActivityResponse, DashboardStatsResponse
from src.services.uptime_service import get_uptime_tracker

router = APIRouter()


@router.get("/stats", response_model=SuccessResponse[DashboardStatsResponse])
async def get_dashboard_stats(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get dashboard statistics with real data.
    Cached for 60 seconds to reduce database load.
    """
    # Check cache first
    cache_key = "dashboard:stats"
    cached = await Cache.get(cache_key)
    if cached:
        return SuccessResponse(data=DashboardStatsResponse(**cached))

    # Real verification stats from verification_log
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Execute queries sequentially (same session cannot be used in parallel)
    total_groups, total_channels = await _get_entity_counts(session)
    verifications_today, verifications_week = await _get_verification_counts(
        session, today_start, week_start
    )
    success_rate = await _get_success_rate(session, week_start)
    cache_hit_rate = await _get_cache_hit_rate(session, today_start)

    # Bot uptime from the uptime tracker service
    uptime_tracker = get_uptime_tracker()
    bot_uptime_seconds = await uptime_tracker.get_uptime_seconds()

    response_data = DashboardStatsResponse(
        total_groups=int(total_groups),
        total_channels=int(total_channels),
        verifications_today=int(verifications_today),
        verifications_week=int(verifications_week),
        success_rate=round(success_rate, 2),
        bot_uptime_seconds=int(bot_uptime_seconds),
        cache_hit_rate=round(cache_hit_rate, 2),
    )

    # Cache for 60 seconds
    await Cache.set(cache_key, response_data.model_dump(), expire=60)

    return SuccessResponse(data=response_data)


async def _get_entity_counts(session: AsyncSession) -> tuple[int, int]:
    """Get total counts for groups and channels."""
    # Protected Groups
    stmt_groups = select(func.count()).select_from(ProtectedGroup)
    total_groups = await session.scalar(stmt_groups) or 0

    # Enforced Channels
    stmt_channels = select(func.count()).select_from(EnforcedChannel)
    total_channels = await session.scalar(stmt_channels) or 0
    return total_groups, total_channels


async def _get_verification_counts(
    session: AsyncSession, today_start: datetime, week_start: datetime
) -> tuple[int, int]:
    """Get verification counts for today and this week."""
    # Today's verifications
    stmt_today = select(func.count()).where(VerificationLog.timestamp >= today_start)
    verifications_today = await session.scalar(stmt_today) or 0

    # This week's verifications
    stmt_week = select(func.count()).where(VerificationLog.timestamp >= week_start)
    verifications_week = await session.scalar(stmt_week) or 0
    return verifications_today, verifications_week


async def _get_success_rate(session: AsyncSession, week_start: datetime) -> float:
    """Calculate success rate for the last 7 days."""
    stmt_success = select(
        func.count().label("total"),
        func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("successful"),
    ).where(VerificationLog.timestamp >= week_start)

    result = await session.execute(stmt_success)
    row = result.one()
    total = row.total or 0
    successful = row.successful or 0
    return (successful / total * 100) if total > 0 else 0.0


async def _get_cache_hit_rate(session: AsyncSession, today_start: datetime) -> float:
    """Calculate cache hit rate for the last 24 hours."""
    stmt_cache = select(
        func.count().label("total"),
        func.sum(case((VerificationLog.cached.is_(True), 1), else_=0)).label("cached"),
    ).where(VerificationLog.timestamp >= today_start - timedelta(days=1))

    cache_result = await session.execute(stmt_cache)
    cache_row = cache_result.one()
    cache_total = cache_row.total or 0
    cache_hits = cache_row.cached or 0
    return (cache_hits / cache_total * 100) if cache_total > 0 else 0.0


@router.get("/activity", response_model=SuccessResponse[ActivityResponse])
async def get_dashboard_activity(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get recent activity feed from verification logs.
    """
    # Query recent verifications for activity feed
    stmt = select(VerificationLog).order_by(VerificationLog.timestamp.desc()).limit(20)
    result = await session.execute(stmt)
    verifications = result.scalars().all()

    items = []
    for v in verifications:
        # Determine activity type and description
        if v.status == "verified":
            description = f"User {v.user_id} verified in group {v.group_id}"
            activity_type = "verification"
        elif v.status in ("restricted", "kicked"):
            description = f"User {v.user_id} restricted in group {v.group_id}"
            activity_type = "protection"
        else:
            description = f"Verification check for user {v.user_id}"
            activity_type = "system"

        items.append(
            {
                "id": str(v.id),
                "type": activity_type,
                "description": description,
                "timestamp": v.timestamp.isoformat(),
                "metadata": {
                    "user_id": v.user_id,
                    "group_id": v.group_id,
                    "status": v.status,
                    "cached": v.cached,
                },
            }
        )

    return SuccessResponse(data=ActivityResponse(items=items))


@router.get("/chart-data")
async def get_chart_data(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get verification trend data for dashboard chart.
    Returns last 30 days of verification data from real database.
    """
    now = datetime.now(UTC)
    start_date = now - timedelta(days=30)

    # Query verification counts grouped by day and status
    stmt = (
        select(
            func.date(VerificationLog.timestamp).label("date"),
            func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("verified"),
            func.sum(case((VerificationLog.status.in_(["restricted", "error"]), 1), else_=0)).label(
                "restricted"
            ),
            func.count().label("total"),
        )
        .where(VerificationLog.timestamp >= start_date)
        .group_by(func.date(VerificationLog.timestamp))
        .order_by(func.date(VerificationLog.timestamp))
    )

    result = await session.execute(stmt)
    rows = result.all()

    # Create a map of dates with data
    data_map = {
        str(row.date): {
            "verified": int(row.verified or 0),
            "restricted": int(row.restricted or 0),
            "total": int(row.total or 0),
        }
        for row in rows
    }

    # Generate all 30 days of data
    data = []
    current = start_date
    total_verified = 0
    total_restricted = 0

    while current <= now:
        date_str = current.strftime("%Y-%m-%d")
        if date_str in data_map:
            entry = data_map[date_str]
            verified = entry["verified"]
            restricted = entry["restricted"]
            total = entry["total"]
        else:
            verified = 0
            restricted = 0
            total = 0

        total_verified += verified
        total_restricted += restricted

        data.append(
            {
                "date": date_str,
                "verified": verified,
                "restricted": restricted,
                "total": total,
            }
        )
        current += timedelta(days=1)

    avg_daily = total_verified + total_restricted
    if len(data) > 0:
        avg_daily = avg_daily // len(data)

    return SuccessResponse(
        data={
            "series": data,
            "summary": {
                "total_verified": total_verified,
                "total_restricted": total_restricted,
                "average_daily": avg_daily,
            },
        }
    )

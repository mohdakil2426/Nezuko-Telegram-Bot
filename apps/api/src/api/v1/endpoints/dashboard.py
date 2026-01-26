"""Dashboard statistics and activity endpoints."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.models.bot import EnforcedChannel, ProtectedGroup
from src.models.verification_log import VerificationLog
from src.schemas.base import SuccessResponse
from src.schemas.dashboard import ActivityResponse, DashboardStatsResponse

router = APIRouter()


@router.get("/stats", response_model=SuccessResponse[DashboardStatsResponse])
async def get_dashboard_stats(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get dashboard statistics with real data.
    """
    # Query database for counts
    # Protected Groups
    stmt_groups = select(func.count()).select_from(ProtectedGroup)
    total_groups = await session.scalar(stmt_groups) or 0

    # Enforced Channels
    stmt_channels = select(func.count()).select_from(EnforcedChannel)
    total_channels = await session.scalar(stmt_channels) or 0

    # Real verification stats from verification_log
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Today's verifications
    stmt_today = select(func.count()).where(VerificationLog.timestamp >= today_start)
    verifications_today = await session.scalar(stmt_today) or 0

    # This week's verifications
    stmt_week = select(func.count()).where(VerificationLog.timestamp >= week_start)
    verifications_week = await session.scalar(stmt_week) or 0

    # Success rate (last 7 days)
    stmt_success = select(
        func.count().label("total"),
        func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("successful"),
    ).where(VerificationLog.timestamp >= week_start)

    result = await session.execute(stmt_success)
    row = result.one()
    total = row.total or 0
    successful = row.successful or 0
    success_rate = (successful / total * 100) if total > 0 else 0.0

    # Cache hit rate from last 24 hours
    stmt_cache = select(
        func.count().label("total"),
        func.sum(case((VerificationLog.cached.is_(True), 1), else_=0)).label("cached"),
    ).where(VerificationLog.timestamp >= today_start - timedelta(days=1))

    cache_result = await session.execute(stmt_cache)
    cache_row = cache_result.one()
    cache_total = cache_row.total or 0
    cache_hits = cache_row.cached or 0
    cache_hit_rate = (cache_hits / cache_total * 100) if cache_total > 0 else 0.0

    # Bot uptime - placeholder for now (would need Prometheus/Redis)
    bot_uptime_seconds = 0

    return SuccessResponse(
        data=DashboardStatsResponse(
            total_groups=int(total_groups),
            total_channels=int(total_channels),
            verifications_today=int(verifications_today),
            verifications_week=int(verifications_week),
            success_rate=round(success_rate, 2),
            bot_uptime_seconds=int(bot_uptime_seconds),
            cache_hit_rate=round(cache_hit_rate, 2),
        )
    )


@router.get("/activity", response_model=SuccessResponse[ActivityResponse])
async def get_dashboard_activity(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),  # pylint: disable=unused-argument
) -> Any:
    """
    Get recent activity feed.
    """
    # TODO: Implement real activity log query from admin_audit_log
    # For now, return empty list
    return SuccessResponse(data=ActivityResponse(items=[]))


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

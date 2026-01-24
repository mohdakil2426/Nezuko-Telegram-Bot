"""Dashboard statistics and activity endpoints."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.models.bot import EnforcedChannel, ProtectedGroup
from src.schemas.dashboard import ActivityResponse, DashboardStatsResponse

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get dashboard statistics.
    """
    # Query database for counts
    # Protected Groups
    stmt_groups = select(func.count()).select_from(ProtectedGroup)
    total_groups = await session.scalar(stmt_groups) or 0

    # Enforced Channels
    stmt_channels = select(func.count()).select_from(EnforcedChannel)
    total_channels = await session.scalar(stmt_channels) or 0

    # TODO: Fetch from actual metrics source
    # Since verification logs are not yet implemented in DB, we use placeholders.
    # In a real scenario, we might scrape the bot's Prometheus endpoint or Redis.
    verifications_today = 0
    verifications_week = 0
    success_rate = 98.5  # Placeholder
    bot_uptime_seconds = 0  # Placeholder
    cache_hit_rate = 0.0  # Placeholder

    return DashboardStatsResponse(
        total_groups=total_groups,
        total_channels=total_channels,
        verifications_today=verifications_today,
        verifications_week=verifications_week,
        success_rate=success_rate,
        bot_uptime_seconds=bot_uptime_seconds,
        cache_hit_rate=cache_hit_rate,
    )


@router.get("/activity", response_model=ActivityResponse)
async def get_dashboard_activity(
    current_user: AdminUser = Depends(get_current_active_user),  # pylint: disable=unused-argument
    session: AsyncSession = Depends(get_session),  # pylint: disable=unused-argument
) -> Any:
    """
    Get recent activity feed.
    """
    # TODO: Implement real activity log query
    # For now, return empty list
    return ActivityResponse(items=[])

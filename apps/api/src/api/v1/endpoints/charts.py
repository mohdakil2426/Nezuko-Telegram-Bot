"""Chart analytics endpoints for the dashboard.

Provides 10 chart endpoints for displaying bot analytics data:
- Verification distribution (pie chart)
- Cache breakdown (donut chart)
- Groups status (bar chart)
- API calls distribution (bar chart)
- Hourly activity (area/line chart)
- Latency distribution (histogram)
- Top groups (table/bar)
- Cache hit rate trend (line chart)
- Latency trend (dual-line chart)
- Bot health (gauges/cards)
"""

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import get_current_session
from src.core.database import get_session
from src.models.session import Session
from src.schemas.base import SuccessResponse
from src.schemas.charts import (
    ApiCallsDistribution,
    BotHealthMetrics,
    CacheBreakdown,
    CacheHitRateTrend,
    GroupsStatusDistribution,
    HourlyActivity,
    LatencyBucket,
    LatencyTrend,
    TopGroupPerformance,
    VerificationDistribution,
)
from src.services.charts_service import charts_service

router = APIRouter()


@router.get(
    "/verification-distribution",
    response_model=SuccessResponse[VerificationDistribution],
)
async def get_verification_distribution(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[VerificationDistribution]:
    """
    Get verification outcome distribution for the last 7 days.

    Returns counts of verified, restricted, and error statuses.
    """
    data = await charts_service.get_verification_distribution(session)
    return SuccessResponse(data=data)


@router.get(
    "/cache-breakdown",
    response_model=SuccessResponse[CacheBreakdown],
)
async def get_cache_breakdown(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[CacheBreakdown]:
    """
    Get cache hit vs API call breakdown for the last 7 days.
    """
    data = await charts_service.get_cache_breakdown(session)
    return SuccessResponse(data=data)


@router.get(
    "/groups-status",
    response_model=SuccessResponse[GroupsStatusDistribution],
)
async def get_groups_status(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[GroupsStatusDistribution]:
    """
    Get active vs inactive protected groups count.
    """
    data = await charts_service.get_groups_status(session)
    return SuccessResponse(data=data)


@router.get(
    "/api-calls",
    response_model=SuccessResponse[list[ApiCallsDistribution]],
)
async def get_api_calls(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[list[ApiCallsDistribution]]:
    """
    Get Telegram API call distribution by method for the last 7 days.
    """
    data = await charts_service.get_api_calls_distribution(session)
    return SuccessResponse(data=data)


@router.get(
    "/hourly-activity",
    response_model=SuccessResponse[list[HourlyActivity]],
)
async def get_hourly_activity(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[list[HourlyActivity]]:
    """
    Get 24-hour activity distribution.

    Returns verification and restriction counts for each hour of the day.
    """
    data = await charts_service.get_hourly_activity(session)
    return SuccessResponse(data=data)


@router.get(
    "/latency-distribution",
    response_model=SuccessResponse[list[LatencyBucket]],
)
async def get_latency_distribution(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[list[LatencyBucket]]:
    """
    Get latency bucket distribution for the last 7 days.

    Returns histogram data with buckets: <50ms, 50-100ms, 100-200ms, 200-500ms, >500ms
    """
    data = await charts_service.get_latency_distribution(session)
    return SuccessResponse(data=data)


@router.get(
    "/top-groups",
    response_model=SuccessResponse[list[TopGroupPerformance]],
)
async def get_top_groups(
    limit: int = Query(10, ge=1, le=20, description="Number of top groups to return"),
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[list[TopGroupPerformance]]:
    """
    Get top groups by verification count for the last 7 days.
    """
    data = await charts_service.get_top_groups(session, limit=limit)
    return SuccessResponse(data=data)


@router.get(
    "/cache-hit-rate-trend",
    response_model=SuccessResponse[CacheHitRateTrend],
)
async def get_cache_hit_rate_trend(
    period: Literal["7d", "30d", "90d"] = Query("30d", description="Time period"),
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[CacheHitRateTrend]:
    """
    Get cache hit rate trend over time.
    """
    data = await charts_service.get_cache_hit_rate_trend(session, period=period)
    return SuccessResponse(data=data)


@router.get(
    "/latency-trend",
    response_model=SuccessResponse[LatencyTrend],
)
async def get_latency_trend(
    period: Literal["7d", "30d", "90d"] = Query("30d", description="Time period"),
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[LatencyTrend]:
    """
    Get average and p95 latency trend over time.
    """
    data = await charts_service.get_latency_trend(session, period=period)
    return SuccessResponse(data=data)


@router.get(
    "/bot-health",
    response_model=SuccessResponse[BotHealthMetrics],
)
async def get_bot_health(
    session: AsyncSession = Depends(get_session),
    current_user: Session = Depends(get_current_session),
) -> SuccessResponse[BotHealthMetrics]:
    """
    Get composite bot health metrics.

    Returns uptime, cache efficiency, success rate, latency score, and overall health.
    """
    data = await charts_service.get_bot_health(session)
    return SuccessResponse(data=data)

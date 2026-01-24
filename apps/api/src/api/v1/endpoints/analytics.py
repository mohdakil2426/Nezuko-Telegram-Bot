"""Analytics and reports endpoints."""

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.schemas.analytics import UserGrowthResponse, VerificationTrendResponse
from src.schemas.base import SuccessResponse
from src.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/users", response_model=SuccessResponse[UserGrowthResponse])
async def get_user_growth(
    period: Literal["7d", "30d", "90d"] = Query("30d"),
    granularity: Literal["day", "week"] = Query("day"),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_active_user),
):
    """Get user growth analytics."""
    data = await analytics_service.get_user_growth(session, period, granularity)
    return SuccessResponse(data=data)


@router.get("/verifications", response_model=SuccessResponse[VerificationTrendResponse])
async def get_verification_trends(
    period: Literal["24h", "7d", "30d"] = Query("7d"),
    granularity: Literal["hour", "day"] = Query("day"),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_active_user),
):
    """Get verification success/failure trends."""
    data = await analytics_service.get_verification_trends(session, period, granularity)
    return SuccessResponse(data=data)

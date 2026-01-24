from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from ...core.database import get_session
from ...services.analytics_service import analytics_service
from ...schemas.base import SuccessResponse
from ...schemas.analytics import UserGrowthResponse, VerificationTrendResponse
from ..dependencies.auth import get_current_admin_user

router = APIRouter()


@router.get("/users", response_model=SuccessResponse[UserGrowthResponse])
async def get_user_growth(
    period: Literal["7d", "30d", "90d"] = Query("30d"),
    granularity: Literal["day", "week"] = Query("day"),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_admin_user),
):
    """Get user growth analytics."""
    data = await analytics_service.get_user_growth(session, period, granularity)
    return SuccessResponse(data=data)


@router.get("/verifications", response_model=SuccessResponse[VerificationTrendResponse])
async def get_verification_trends(
    period: Literal["24h", "7d", "30d"] = Query("7d"),
    granularity: Literal["hour", "day"] = Query("day"),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_admin_user),
):
    """Get verification success/failure trends."""
    data = await analytics_service.get_verification_trends(session, period, granularity)
    return SuccessResponse(data=data)

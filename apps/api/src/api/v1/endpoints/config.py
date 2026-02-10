"""System configuration management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import get_current_session
from src.core.database import get_session
from src.models.session import Session
from src.schemas.base import SuccessResponse
from src.schemas.config import (
    ConfigResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    WebhookTestResult,
)
from src.services.config_service import ConfigService

router = APIRouter()


@router.get("", response_model=SuccessResponse[ConfigResponse])
async def get_config(
    current_user: Annotated[Session, Depends(get_current_session)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SuccessResponse[ConfigResponse]:
    """
    Get system configuration.
    """
    service = ConfigService(session)
    config = await service.get_config()
    return SuccessResponse(data=config)


@router.put("", response_model=SuccessResponse[ConfigUpdateResponse])
async def update_config(
    data: ConfigUpdateRequest,
    current_user: Annotated[Session, Depends(get_current_session)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SuccessResponse[ConfigUpdateResponse]:
    """
    Update system configuration.
    """
    service = ConfigService(session)
    result = await service.update_config(data)
    return SuccessResponse(data=result)


@router.post("/webhook/test", response_model=SuccessResponse[WebhookTestResult])
async def test_webhook(
    current_user: Annotated[Session, Depends(get_current_session)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SuccessResponse[WebhookTestResult]:
    """
    Test webhook connectivity.
    """
    service = ConfigService(session)
    result = await service.test_webhook()
    return SuccessResponse(data=result)

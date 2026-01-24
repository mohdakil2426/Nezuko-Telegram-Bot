from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.config import (
    ConfigResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    WebhookTestResult,
)
from src.services.config_service import ConfigService

router = APIRouter()


@router.get("", response_model=ConfigResponse)
async def get_config(
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    """
    Get system configuration.
    """
    service = ConfigService(session)
    return await service.get_config()


@router.put("", response_model=ConfigUpdateResponse)
async def update_config(
    data: ConfigUpdateRequest,
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    """
    Update system configuration.
    """
    service = ConfigService(session)
    return await service.update_config(data)


@router.post("/webhook/test", response_model=WebhookTestResult)
async def test_webhook(
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    """
    Test webhook connectivity.
    """
    service = ConfigService(session)
    return await service.test_webhook()

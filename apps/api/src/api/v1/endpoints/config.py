from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.core.database import get_db
from src.api.core.security import get_current_active_user
from src.api.models.admin_user import AdminUser
from src.api.schemas.config import (
    ConfigResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    WebhookTestResult,
)
from src.api.services.config_service import ConfigService

router = APIRouter()


@router.get("", response_model=ConfigResponse)
async def get_config(
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
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
    session: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update system configuration.
    """
    service = ConfigService(session)
    return await service.update_config(data)


@router.post("/webhook/test", response_model=WebhookTestResult)
async def test_webhook(
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Test webhook connectivity.
    """
    service = ConfigService(session)
    return await service.test_webhook()

"""System logs retrieval endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Query

from src.api.v1.dependencies.auth import get_current_active_user
from src.models.admin_user import AdminUser
from src.schemas.base import SuccessResponse
from src.services.log_service import log_service

router = APIRouter()


@router.get("", response_model=SuccessResponse[list[dict[str, Any]]])
async def get_logs(
    limit: int = Query(100, le=1000),
    level: str | None = None,
    search: str | None = None,
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[list[dict[str, Any]]]:
    """
    Get historical logs.
    """
    logs = await log_service.get_logs(limit=limit, level=level, search=search)
    return SuccessResponse(data=logs)

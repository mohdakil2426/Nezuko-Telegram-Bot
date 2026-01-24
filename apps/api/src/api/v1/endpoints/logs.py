from fastapi import APIRouter, Depends, Query

from src.api.schemas.base import SuccessResponse
from src.api.services.log_service import log_service
from src.api.v1.dependencies.auth import get_current_admin_user

router = APIRouter()


@router.get("", response_model=SuccessResponse[list[dict]])
async def get_logs(
    limit: int = Query(100, le=1000),
    level: str | None = None,
    search: str | None = None,
    current_user=Depends(get_current_admin_user),
):
    """
    Get historical logs.
    """
    logs = await log_service.get_logs(limit=limit, level=level, search=search)
    return SuccessResponse(data=logs)

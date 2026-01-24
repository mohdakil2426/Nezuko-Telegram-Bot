from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from ...schemas.base import SuccessResponse
from ...services.log_service import log_service
from ..dependencies.auth import get_current_admin_user

router = APIRouter()


@router.get("", response_model=SuccessResponse[List[dict]])
async def get_logs(
    limit: int = Query(100, le=1000),
    level: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_admin_user),
):
    """
    Get historical logs.
    """
    logs = await log_service.get_logs(limit=limit, level=level, search=search)
    return SuccessResponse(data=logs)

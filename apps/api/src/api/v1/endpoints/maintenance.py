"""Maintenance endpoints for data retention and storage management.

Provides super_admin-only endpoints for:
- Cleaning up old log data
- Viewing storage statistics
"""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user, require_super_admin
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.base import SuccessResponse
from src.services import maintenance_service

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.post("/cleanup")
async def cleanup_old_data(
    days_to_keep: int = Query(default=90, ge=7, le=365),
    session: AsyncSession = Depends(get_session),
    _current_user: AdminUser = Depends(require_super_admin),
) -> SuccessResponse[dict[str, Any]]:
    """Clean up old log data beyond the retention period.

    Requires super_admin role.

    Args:
        days_to_keep: Number of days of data to retain (7-365, default: 90).
        session: Database session.
        _current_user: Current user (must be super_admin).

    Returns:
        SuccessResponse with cleanup results.
    """
    logger.info(
        "cleanup_requested",
        days_to_keep=days_to_keep,
    )

    result = await maintenance_service.run_full_cleanup(session, days_to_keep)

    logger.info(
        "cleanup_complete",
        api_call_logs_deleted=result["api_call_logs_deleted"],
        verification_logs_deleted=result["verification_logs_deleted"],
        total_deleted=result["total_deleted"],
    )

    return SuccessResponse(data=dict(result))


@router.get("/storage-stats")
async def get_storage_stats(
    session: AsyncSession = Depends(get_session),
    _current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[dict[str, Any]]:
    """Get storage statistics for analytics tables.

    Args:
        session: Database session.
        _current_user: Current authenticated user.

    Returns:
        SuccessResponse with storage statistics.
    """
    stats = await maintenance_service.get_storage_stats(session)

    return SuccessResponse(data=dict(stats))

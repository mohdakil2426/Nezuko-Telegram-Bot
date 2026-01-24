"""Audit API Endpoint."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.api.v1.dependencies.permissions import require_permission
from apps.api.src.core.database import get_session
from apps.api.src.core.permissions import Permission, Role
from apps.api.src.schemas.audit import AuditLogListResponse
from apps.api.src.services.audit_service import AuditService

router = APIRouter()


class AuditLogFilters:
    """Dependency for audit log filtering."""

    def __init__(
        self,
        user_id: UUID | None = None,
        action: str | None = None,
        resource_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> None:
        self.user_id = user_id
        self.action = action
        self.resource_type = resource_type
        self.start_date = start_date
        self.end_date = end_date


@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    filters: AuditLogFilters = Depends(),  # noqa: B008
    page: int = Query(1, ge=1),  # noqa: B008
    per_page: int = Query(20, ge=1, le=100),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    current_user: dict = Depends(require_permission(Permission.VIEW_AUDIT_LOG)),  # noqa: B008
) -> AuditLogListResponse:
    """
    Get audit logs with filtering.
    """
    # Security: If not OWNER, force filter by own user_id (Admin can see own actions)
    user_role = Role(current_user["role"])
    request_user_id = filters.user_id

    if user_role != Role.OWNER:
        # Override user_id filter to current user's ID
        request_user_id = UUID(current_user["sub"])

    service = AuditService(session)
    logs, total = await service.get_logs(
        page=page,
        per_page=per_page,
        user_id=request_user_id,
        action=filters.action,
        resource_type=filters.resource_type,
        start_date=filters.start_date,
        end_date=filters.end_date,
    )

    return AuditLogListResponse(
        items=logs,
        total=total,
        page=page,
        per_page=per_page,
    )

"""Audit API Endpoint."""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.permissions import require_permission
from src.core.database import get_session
from src.core.permissions import Permission, Role
from src.models.admin_user import AdminUser
from src.schemas.audit import AuditLogListResponse, AuditLogResponse
from src.services.audit_service import AuditService

router = APIRouter()


class AuditLogFilters:
    """Dependency for audit log filtering."""

    def __init__(
        self,
        user_id: str | None = None,
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
    filters: AuditLogFilters = Depends(),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    output_format: str | None = Query(None, description="Response format: json or csv"),
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(require_permission(Permission.VIEW_AUDIT_LOG)),
) -> AuditLogListResponse | StreamingResponse:
    """
    Get audit logs with filtering.

    Set format=csv to download as CSV file.
    """
    # Security: If not OWNER, force filter by own user_id (Admin can see own actions)
    user_role = Role(current_user.role)
    request_user_id: str | None = filters.user_id

    if user_role != Role.OWNER:
        # Override user_id filter to current user's ID
        request_user_id = current_user.id

    service = AuditService(session)

    # For CSV export, get all matching records (up to 10000)
    if output_format == "csv":
        logs, _ = await service.get_logs(
            page=1,
            per_page=10000,  # Max export limit
            user_id=request_user_id,
            action=filters.action,
            resource_type=filters.resource_type,
            start_date=filters.start_date,
            end_date=filters.end_date,
        )

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(
            [
                "Timestamp",
                "User ID",
                "User Email",
                "Action",
                "Resource Type",
                "Resource ID",
                "IP Address",
                "User Agent",
                "Old Value",
                "New Value",
            ]
        )

        # Write data rows
        for log in logs:
            writer.writerow(
                [
                    log.created_at.isoformat() if log.created_at else "",
                    log.user_id or "",
                    log.user.email if log.user else "",
                    log.action or "",
                    log.resource_type or "",
                    log.resource_id or "",
                    log.ip_address or "",
                    log.user_agent or "",
                    str(log.old_value) if log.old_value else "",
                    str(log.new_value) if log.new_value else "",
                ]
            )

        output.seek(0)
        filename = f"audit-logs-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # Standard JSON response
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
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page,
    )

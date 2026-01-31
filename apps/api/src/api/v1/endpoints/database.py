"""Database browser and inspection endpoints with CRUD operations."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.api.v1.dependencies.permissions import require_permission
from src.core.database import get_session
from src.core.permissions import Permission
from src.models.admin_user import AdminUser
from src.schemas.base import SuccessResponse
from src.schemas.database import MigrationStatusResponse, TableDataResponse, TableListResponse
from src.services.audit_service import AuditService
from src.services.db_service import DatabaseService

router = APIRouter()

# Create properly typed service instance
_db_service: DatabaseService = DatabaseService()

# Tables that can be modified via API
MODIFIABLE_TABLES = {
    "protected_groups",
    "enforced_channels",
    "group_channel_links",
    "admin_config",
}

# Tables that are blocked from any modification
BLOCKED_TABLES = {
    "admin_users",
    "admin_sessions",
    "admin_audit_log",
    "alembic_version",
}


class UpdateRowRequest(BaseModel):
    """Request body for updating a row."""

    data: dict[str, Any]


class DeleteRowResponse(BaseModel):
    """Response for delete operation."""

    deleted_id: str
    table: str


def validate_table_access(table_name: str) -> None:
    """Validate table is allowed for modification."""
    if table_name in BLOCKED_TABLES:
        raise HTTPException(
            status_code=403, detail=f"Table '{table_name}' is protected and cannot be modified"
        )
    if table_name not in MODIFIABLE_TABLES:
        raise HTTPException(
            status_code=403,
            detail=f"Table '{table_name}' is not in the allowed list for modifications",
        )


@router.get("/tables", response_model=SuccessResponse[TableListResponse])
async def list_tables(
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[TableListResponse]:
    """List all database tables with stats."""
    tables = await _db_service.get_tables(session)
    return SuccessResponse(data=TableListResponse(tables=tables))


@router.get("/tables/{table_name}", response_model=SuccessResponse[TableDataResponse])
async def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[TableDataResponse]:
    """Get raw data from a specific table."""
    try:
        data = await _db_service.get_table_data(session, table_name, page, per_page)
        return SuccessResponse(data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/tables/{table_name}/{row_id}")
async def update_row(
    table_name: str,
    row_id: str,
    body: UpdateRowRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(
        require_permission(Permission.MODIFY_DATABASE)
    ),
) -> SuccessResponse[dict[str, Any]]:
    """
    Update a row in a database table.

    Requires MANAGE_DATABASE permission. Only tables in the modifiable whitelist
    can be updated. Blocked tables will return 403.
    """
    validate_table_access(table_name)

    try:
        # Get old value for audit
        old_data = await _db_service.get_row_by_id(session, table_name, row_id)
        if not old_data:
            raise HTTPException(status_code=404, detail=f"Row {row_id} not found in {table_name}")

        # Update the row
        updated_row = await _db_service.update_row(session, table_name, row_id, body.data)

        # Log to audit trail
        audit_service = AuditService(session)
        await audit_service.create_log(
            action="UPDATE",
            resource_type=table_name,
            resource_id=row_id,
            user_id=current_user.id,
            old_value=old_data,
            new_value=body.data,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return SuccessResponse(data=updated_row)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/tables/{table_name}/{row_id}")
async def delete_row(
    table_name: str,
    row_id: str,
    request: Request,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(
        require_permission(Permission.MODIFY_DATABASE)
    ),
) -> SuccessResponse[DeleteRowResponse]:
    """
    Delete a row from a database table.

    Requires MANAGE_DATABASE permission. By default, performs soft delete
    (sets deleted_at). Use hard_delete=true for permanent removal.
    """
    validate_table_access(table_name)

    try:
        # Get old value for audit
        old_data = await _db_service.get_row_by_id(session, table_name, row_id)
        if not old_data:
            raise HTTPException(status_code=404, detail=f"Row {row_id} not found in {table_name}")

        # Check for foreign key dependencies
        dependencies = await _db_service.check_dependencies(session, table_name, row_id)
        if dependencies:
            dep_str = ", ".join([f"{d['table']} ({d['count']} rows)" for d in dependencies])
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete: row has dependencies in {dep_str}",
            )

        # Delete the row
        await _db_service.delete_row(session, table_name, row_id, hard_delete=hard_delete)

        # Log to audit trail
        audit_service = AuditService(session)
        await audit_service.create_log(
            action="DELETE" if hard_delete else "SOFT_DELETE",
            resource_type=table_name,
            resource_id=row_id,
            user_id=current_user.id,
            old_value=old_data,
            new_value=None,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return SuccessResponse(data=DeleteRowResponse(deleted_id=row_id, table=table_name))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/migrations", response_model=SuccessResponse[MigrationStatusResponse])
async def get_migrations(
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[MigrationStatusResponse]:
    """Get database migration status."""
    status = await _db_service.get_migrations(session)
    return SuccessResponse(data=status)

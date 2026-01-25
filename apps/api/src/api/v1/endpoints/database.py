"""Database browser and inspection endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.base import SuccessResponse
from src.schemas.database import MigrationStatusResponse, TableDataResponse, TableListResponse
from src.services.db_service import db_service

router = APIRouter()


@router.get("/tables", response_model=SuccessResponse[TableListResponse])
async def list_tables(
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[TableListResponse]:
    """List all database tables with stats."""
    tables = await db_service.get_tables(session)
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
        data = await db_service.get_table_data(session, table_name, page, per_page)
        return SuccessResponse(data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/migrations", response_model=SuccessResponse[MigrationStatusResponse])
async def get_migrations(
    session: AsyncSession = Depends(get_session),
    current_user: AdminUser = Depends(get_current_active_user),
) -> SuccessResponse[MigrationStatusResponse]:
    """Get database migration status."""
    status = await db_service.get_migrations(session)
    return SuccessResponse(data=status)

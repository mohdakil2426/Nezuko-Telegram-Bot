from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.core.database import get_session
from src.api.schemas.base import SuccessResponse
from src.api.schemas.database import MigrationStatusResponse, TableDataResponse, TableListResponse
from src.api.services.db_service import db_service
from src.api.v1.dependencies.auth import get_current_admin_user

router = APIRouter()


@router.get("/tables", response_model=SuccessResponse[TableListResponse])
async def list_tables(
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_admin_user),
):
    """List all database tables with stats."""
    tables = await db_service.get_tables(session)
    return SuccessResponse(data=TableListResponse(tables=tables))


@router.get("/tables/{table_name}", response_model=SuccessResponse[TableDataResponse])
async def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_admin_user),
):
    """Get raw data from a specific table."""
    try:
        data = await db_service.get_table_data(session, table_name, page, per_page)
        return SuccessResponse(data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/migrations", response_model=SuccessResponse[MigrationStatusResponse])
async def get_migrations(
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_admin_user),
):
    """Get database migration status."""
    status = await db_service.get_migrations(session)
    return SuccessResponse(data=status)

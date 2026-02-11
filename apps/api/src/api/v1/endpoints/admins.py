"""Admin management API endpoints.

Handles admin user CRUD with proper exception handling.
Uses domain exceptions from AdminService (not raw HTTPException in service).
"""

from collections.abc import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.permissions import Permission, require_permission
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.admin import AdminCreateRequest, AdminResponse, AdminUpdateRequest
from src.services.admin_service import (
    AdminAlreadyExistsError,
    AdminNotFoundError,
    AdminService,
)

router = APIRouter()


@router.get("", response_model=list[AdminResponse])
async def get_admins(
    session: AsyncSession = Depends(get_session),
    _: AdminUser = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> Sequence[AdminUser]:
    """List all admin users (Requires MANAGE_ADMINS permission)."""
    service = AdminService(session)
    return await service.get_admins()


@router.post("", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreateRequest,
    session: AsyncSession = Depends(get_session),
    _: AdminUser = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminUser:
    """Create a new admin user.

    Raises:
        HTTPException: 409 if admin email already exists.
    """
    service = AdminService(session)
    try:
        return await service.create_admin(data)
    except AdminAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.get("/{admin_id}", response_model=AdminResponse)
async def get_admin(
    admin_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: AdminUser = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminUser:
    """Get admin details.

    Raises:
        HTTPException: 404 if admin not found.
    """
    service = AdminService(session)
    admin = await service.get_admin(admin_id)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )
    return admin


@router.put("/{admin_id}", response_model=AdminResponse)
async def update_admin(
    admin_id: UUID,
    data: AdminUpdateRequest,
    session: AsyncSession = Depends(get_session),
    _: AdminUser = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminUser:
    """Update an admin user.

    Raises:
        HTTPException: 404 if admin not found.
    """
    service = AdminService(session)
    try:
        return await service.update_admin(admin_id, data)
    except AdminNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: AdminUser = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> None:
    """Delete an admin user.

    Note: Self-deletion prevention removed since auth was removed.
    """
    service = AdminService(session)
    try:
        await service.delete_admin(admin_id)
    except AdminNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

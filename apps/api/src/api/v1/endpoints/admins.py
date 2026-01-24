from collections.abc import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.api.v1.dependencies.permissions import Permission, require_permission
from apps.api.src.core.database import get_session
from apps.api.src.schemas.admin import AdminCreateRequest, AdminResponse, AdminUpdateRequest
from apps.api.src.services.admin_service import AdminService

router = APIRouter()


@router.get("", response_model=list[AdminResponse])
async def get_admins(
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> Sequence[AdminResponse]:
    """List all admin users (Requires MANAGE_ADMINS permission)."""
    service = AdminService(session)
    return await service.get_admins()


@router.post("", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreateRequest,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminResponse:
    """Create a new admin user."""
    service = AdminService(session)
    return await service.create_admin(data)


@router.get("/{admin_id}", response_model=AdminResponse)
async def get_admin(
    admin_id: UUID,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminResponse:
    """Get admin details."""
    service = AdminService(session)
    admin = await service.get_admin(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin


@router.put("/{admin_id}", response_model=AdminResponse)
async def update_admin(
    admin_id: UUID,
    data: AdminUpdateRequest,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> AdminResponse:
    """Update an admin user."""
    service = AdminService(session)
    return await service.update_admin(admin_id, data)


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_permission(Permission.MANAGE_ADMINS)),
) -> None:
    """Delete an admin user."""
    # Prevent self-deletion
    if str(admin_id) == current_user.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    service = AdminService(session)
    await service.delete_admin(admin_id)

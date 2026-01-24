from uuid import UUID
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from apps.api.src.models.admin_user import AdminUser
from apps.api.src.schemas.admin import AdminCreateRequest, AdminUpdateRequest
from apps.api.src.core.security import get_password_hash


class AdminService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_admins(self) -> Sequence[AdminUser]:
        result = await self.session.execute(select(AdminUser))
        return result.scalars().all()

    async def get_admin(self, admin_id: UUID) -> AdminUser | None:
        return await self.session.get(AdminUser, admin_id)

    async def get_admin_by_email(self, email: str) -> AdminUser | None:
        result = await self.session.execute(select(AdminUser).where(AdminUser.email == email))
        return result.scalar_one_or_none()

    async def create_admin(self, data: AdminCreateRequest) -> AdminUser:
        # Check if email exists
        existing = await self.get_admin_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Admin with this email already exists"
            )

        admin = AdminUser(
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            password_hash=get_password_hash(data.password),
            telegram_id=data.telegram_id,
            is_active=data.is_active,
        )
        self.session.add(admin)
        await self.session.commit()
        await self.session.refresh(admin)
        return admin

    async def update_admin(self, admin_id: UUID, data: AdminUpdateRequest) -> AdminUser:
        admin = await self.get_admin(admin_id)
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        updated_data = data.model_dump(exclude_unset=True)
        if "password" in updated_data:
            updated_data["password_hash"] = get_password_hash(updated_data.pop("password"))

        for field, value in updated_data.items():
            setattr(admin, field, value)

        await self.session.commit()
        await self.session.refresh(admin)
        return admin

    async def delete_admin(self, admin_id: UUID) -> bool:
        admin = await self.get_admin(admin_id)
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        await self.session.delete(admin)
        await self.session.commit()
        return True

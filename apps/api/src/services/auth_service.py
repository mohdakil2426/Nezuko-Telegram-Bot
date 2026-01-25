"""Business logic for authentication and user syncing."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.admin_user import AdminUser


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_supabase_user(self, supabase_user: Any, role: str = "viewer") -> AdminUser:
        """
        Ensure Supabase user exists in local DB.
        """
        user_id = uuid.UUID(supabase_user.id)
        email = supabase_user.email

        stmt = select(AdminUser).where(AdminUser.supabase_id == str(user_id))
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # Check by email
            stmt = select(AdminUser).where(AdminUser.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if user:
                user.supabase_id = str(user_id)
            else:
                user = AdminUser(
                    supabase_id=str(user_id),
                    email=email,
                    role=role,
                    is_active=True,
                    full_name=supabase_user.user_metadata.get("full_name"),
                )
                self.session.add(user)

        user.last_login = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return user

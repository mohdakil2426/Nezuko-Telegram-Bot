"""Business logic for authentication and user syncing."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.admin_user import AdminUser


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_firebase_user(
        self, firebase_user: dict[str, Any], role: str = "viewer"
    ) -> AdminUser:
        """
        Ensure Firebase user exists in local DB.
        """
        uid = firebase_user["uid"]
        email = firebase_user.get("email")

        stmt = select(AdminUser).where(AdminUser.firebase_uid == uid)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user and email:
            # Check by email
            stmt = select(AdminUser).where(AdminUser.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if user:
                user.firebase_uid = uid
            else:
                user = AdminUser(
                    firebase_uid=uid,
                    email=email,
                    role=role,
                    is_active=True,
                    full_name=firebase_user.get("name"),
                )
                self.session.add(user)

        if not user:
            # Should not happen as we create it above, but satisfies type checker
            raise ValueError("Failed to create or retrieve user")

        user.last_login = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return user

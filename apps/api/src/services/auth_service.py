"""Business logic for authentication and user syncing."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.admin_user import AdminUser


class AuthService:  # pylint: disable=too-few-public-methods
    """Service for authentication and user syncing."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_supabase_user(
        self, auth_user: dict[str, Any], role: str = "viewer"
    ) -> AdminUser:
        """
        Ensure Supabase user exists in local DB.
        """
        uid = auth_user["uid"]
        email = auth_user.get("email")

        from src.core.config import get_settings

        settings = get_settings()

        if settings.MOCK_AUTH:
            # Just mock return an object, don't touch DB if not needed,
            # OR ensure we return the one we created in dependencies/auth.py
            # But here we need to persist or return a valid AdminUser linked to session?
            # Actually, if MOCK_AUTH is on, we are likely bypassing real DB restrictions or just testing API.
            # Let's check DB for the mock user we know exists 'admin@nezuko.bot'
            stmt = select(AdminUser).where(AdminUser.email == "admin@nezuko.bot")
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return user
            # If not found but MOCK_AUTH is on (maybe first run), create it
            user = AdminUser(
                supabase_uid="f0689869-bdcc-4c67-aef5-36c6ffd528d7",
                email="admin@nezuko.bot",
                full_name="Admin User",
                role="super_admin",
                is_active=True,
            )
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)
            return user

        # Check by Supabase UID
        stmt = select(AdminUser).where(AdminUser.supabase_uid == uid)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user and email:
            # Check by email (migration catch)
            stmt = select(AdminUser).where(AdminUser.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if user:
                # Link existing user to Supabase UID
                user.supabase_uid = uid
            else:
                user = AdminUser(
                    supabase_uid=uid,
                    email=email,
                    role=role,
                    is_active=True,
                    full_name=auth_user.get("name"),
                )
                self.session.add(user)

        if not user:
            # Should not happen as we create it above, but satisfies type checker
            raise ValueError("Failed to create or retrieve user")

        user.last_login = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return user

"""Business logic for authentication and user syncing."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.admin_user import AdminUser


async def get_admin_by_supabase_id(session: AsyncSession, supabase_uid: str) -> AdminUser | None:
    """Get admin user by Supabase UID."""
    stmt = select(AdminUser).where(AdminUser.supabase_uid == supabase_uid)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_admin_by_email(session: AsyncSession, email: str) -> AdminUser | None:
    """Get admin user by email."""
    stmt = select(AdminUser).where(AdminUser.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_admin_user(
    session: AsyncSession,
    email: str,
    supabase_uid: str,
    role: str = "viewer",
    full_name: str | None = None,
) -> AdminUser:
    """Create a new admin user."""
    user = AdminUser(
        email=email,
        supabase_uid=supabase_uid,
        role=role,
        full_name=full_name or email.split("@")[0],
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def create_admin_from_supabase(
    session: AsyncSession,
    supabase_uid: str,
    email: str | None,
) -> AdminUser:
    """
    Create an admin user from Supabase auth data.
    Called on first login to auto-create admin record.
    """
    return await create_admin_user(
        session=session,
        email=email or f"{supabase_uid}@supabase.user",
        supabase_uid=supabase_uid,
        role="viewer",  # Default role for new users
    )


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
            user = await get_admin_by_email(self.session, "admin@nezuko.bot")
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
        user = await get_admin_by_supabase_id(self.session, uid)

        if not user and email:
            # Check by email (migration catch)
            user = await get_admin_by_email(self.session, email)

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

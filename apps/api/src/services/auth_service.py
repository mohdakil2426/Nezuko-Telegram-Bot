import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from src.models.admin_session import AdminSession
from src.models.admin_user import AdminUser

settings = get_settings()


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def authenticate_user(self, email: str, password: str) -> AdminUser | None:
        """
        Authenticate a user by email and password.
        """
        stmt = select(AdminUser).where(AdminUser.email == email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        # Update last login
        user.last_login = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def create_session(
        self,
        user_id: uuid.UUID,
        ip_address: str | None,
        user_agent: str | None,
    ) -> AdminSession:
        """
        Create a new session (refresh token) for a user.
        """
        refresh_token = create_refresh_token(str(user_id))

        # Calculate expiry based on config
        expires_at = datetime.now(UTC) + timedelta(
            days=settings.ADMIN_JWT_REFRESH_EXPIRE_DAYS,
        )

        # We store the raw token in the DB to match against.
        # In a higher security setup, we might hash it, but here we need to return it too?
        # Actually create_refresh_token returns the JWT string.
        # We store it in DB to track validity/revocation.

        db_session = AdminSession(
            user_id=user_id,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )
        self.session.add(db_session)
        await self.session.commit()
        await self.session.refresh(db_session)
        return db_session

    async def get_session_by_token(self, refresh_token: str) -> AdminSession | None:
        stmt = select(AdminSession).where(AdminSession.refresh_token == refresh_token)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_session(self, refresh_token: str) -> bool:
        """
        Revoke a session (logout).
        """
        stmt = delete(AdminSession).where(AdminSession.refresh_token == refresh_token)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return (
            bool(result.rowcount)
            if hasattr(result, "rowcount") and result.rowcount is not None
            else True
        )

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> None:
        """
        Revoke all sessions for a user (security breach).
        """
        stmt = delete(AdminSession).where(AdminSession.user_id == user_id)
        await self.session.execute(stmt)
        await self.session.commit()

    async def refresh_session(
        self,
        refresh_token: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> tuple[str, str, int]:
        """
        Rotate refresh token and issue new access token.
        Returns: (new_access_token, new_refresh_token, expires_in)
        """
        # 1. Decode token (validates signature and expiry)
        try:
            payload = decode_token(refresh_token)
        except Exception:
            # If token is invalid/expired JWT-wise, check if it was in DB?
            # Actually if it expired, we might still want to check if it WAS valid to detect reuse if we kept history.
            # But here we just fail.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = uuid.UUID(payload["sub"])

        # 2. Check DB for session
        db_session = await self.get_session_by_token(refresh_token)

        if not db_session:
            # Token valid but not in DB -> REUSE DETECTED? or already revoked.
            # Security: Revoke all sessions for this user if we suspect reuse.
            # However, simpler logic: duplicate use of a refresh token (if we rotated it) implies theft.
            # Since we delete the old one on rotation, if someone tries to use it again, it won't be in DB.
            # We can't know *attempted* reuse unless we keep a list of used tokens or assume any valid-signature token not in DB is suspicious.
            # Let's be strict: if signature valid but not in DB, it's suspicious.

            # Check if user exists first?
            # We'll just revoke all sessions to be safe.
            await self.revoke_all_user_sessions(user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session (Token Reuse Detected)",
            )

        # 3. Check expiry (DB field)
        if db_session.expires_at < datetime.now(UTC):
            await self.revoke_session(refresh_token)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

        # 4. Rotation: Delete old session, create new one
        await self.session.delete(db_session)
        # Flush to ensure delete happens before new one (though UUIDs differ)
        await self.session.flush()

        # Create new session
        # Get user role for access token
        stmt = select(AdminUser).where(AdminUser.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        new_session = await self.create_session(user.id, ip_address, user_agent)

        # Create access token
        access_token = create_access_token(str(user.id), user.role, str(new_session.id))

        return (
            access_token,
            new_session.refresh_token,
            settings.ADMIN_JWT_ACCESS_EXPIRE_MINUTES * 60,
        )

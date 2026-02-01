"""Authentication dependencies for API endpoints."""

from datetime import UTC

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.core.security import verify_jwt
from src.models.admin_user import AdminUser

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_BASE_URL}/api/v1/auth/login",
    auto_error=False,
)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    """
    Validate Supabase JWT and return current user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # MOCK AUTH for development if keys are missing
    # MOCK AUTH for development if keys are missing
    if settings.MOCK_AUTH:
        import uuid
        from datetime import datetime

        now = datetime.now(UTC)
        return AdminUser(
            id=str(uuid.uuid4()),
            email="admin@nezuko.bot",
            full_name="Admin User",
            role="super_admin",
            is_active=True,
            supabase_uid="f0689869-bdcc-4c67-aef5-36c6ffd528d7",
            created_at=now,
            updated_at=now,
            last_login=now,
        )

    try:
        if not token:
            raise credentials_exception

        # 1. Verify token with Supabase
        auth_user = verify_jwt(token)
        uid = auth_user["uid"]
        email = auth_user.get("email")
    except (ValueError, Exception) as exc:
        raise credentials_exception from exc

    # 2. Check local DB
    # First try by supabase_uid
    stmt = select(AdminUser).where(AdminUser.supabase_uid == uid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user and email:
        # 3. Migration Fallback: Try by email
        # If user exists by email but has no supabase_id, link them.
        stmt = select(AdminUser).where(AdminUser.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            # Link existing user to Supabase UID
            user.supabase_uid = uid
            session.add(user)
            await session.commit()
            await session.refresh(user)

    if user is None:
        # Valid Supabase user, but not in our Admin DB (Unauthorized)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized to access this panel",
        )

    return user


async def get_current_active_user(
    current_user: AdminUser = Depends(get_current_user),
) -> AdminUser:
    """
    Check if current user is active.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Alias for backward compatibility or more specific usage
get_current_admin_user = get_current_active_user

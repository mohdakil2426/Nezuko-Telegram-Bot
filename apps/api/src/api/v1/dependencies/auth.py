"""Authentication dependencies for API endpoints."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.core.security import verify_supabase_token
from src.models.admin_user import AdminUser

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_BASE_URL}/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
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

    try:
        # 1. Verify token with Supabase
        supabase_user = verify_supabase_token(token)
        user_uuid = uuid.UUID(supabase_user.id)
        email = supabase_user.email
    except (ValueError, Exception) as exc:
        # verify_supabase_token raises ValueError on invalid token
        raise credentials_exception from exc

    # 2. Check local DB
    # First try by supabase_id
    stmt = select(AdminUser).where(AdminUser.supabase_id == str(user_uuid))
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user and email:
        # 3. Migration Fallback: Try by email
        # If user exists by email but has no supabase_id, link them.
        stmt = select(AdminUser).where(AdminUser.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            # Link existing user to Supabase ID
            user.supabase_id = str(user_uuid)
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

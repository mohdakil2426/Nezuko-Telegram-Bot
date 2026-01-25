"""Authentication dependencies for API endpoints."""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.core.security import verify_firebase_token
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
        # 1. Verify token with Firebase
        firebase_user = await verify_firebase_token(token)
        uid = firebase_user["uid"]
        email = firebase_user.get("email")
    except (ValueError, Exception) as exc:
        raise credentials_exception from exc

    # MOCK AUTH for development if database is down
    if os.getenv("MOCK_AUTH") == "true":
        return AdminUser(
            email=email or "mock@admin.me",
            full_name="Mock Admin",
            is_active=True,
            firebase_uid=uid or "mock_uid",
        )

    # 2. Check local DB
    # First try by firebase_uid
    stmt = select(AdminUser).where(AdminUser.firebase_uid == uid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user and email:
        # 3. Migration Fallback: Try by email
        # If user exists by email but has no supabase_id, link them.
        stmt = select(AdminUser).where(AdminUser.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            # Link existing user to Firebase UID
            user.firebase_uid = uid
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

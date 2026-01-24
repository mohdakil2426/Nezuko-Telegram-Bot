"""Authentication dependencies for API endpoints."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.core.security import decode_token
from src.models.admin_user import AdminUser

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_BASE_URL}/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    """
    Validate JWT access token and return current user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        try:
            user_id = uuid.UUID(str(sub))
        except (ValueError, TypeError) as exc:
            raise credentials_exception from exc
    except JWTError as exc:
        raise credentials_exception from exc

    # Optional: Check if session is revoked in Redis?
    # For now relying on short TTL.

    # We return a schema or model? Schema is usually better for dependencies.
    # But often we need the user model for subsequent logic (permissions).
    # Let's return the model for now, or fetch it.

    # Since we need to check is_active, let's fetch the user.
    # To avoid DB hit on every request, we could cache this in Redis.
    # But for Phase 1, DB fetch.

    stmt = select(AdminUser).where(AdminUser.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

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

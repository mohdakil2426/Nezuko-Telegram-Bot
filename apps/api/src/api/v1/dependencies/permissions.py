from fastapi import Depends, HTTPException, status
from typing import Callable

from apps.api.src.api.v1.dependencies.auth import get_current_active_user
from apps.api.src.core.permissions import Role, Permission, ROLE_PERMISSIONS


def require_permission(permission: Permission) -> Callable:
    """Dependency factory to check if user has required permission."""

    async def permission_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role_str = current_user.get("role")
        try:
            # Handle case where role might be mocked or invalid
            user_role = Role(user_role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid user role configuration"
            )

        allowed_permissions = ROLE_PERMISSIONS.get(user_role, [])

        if permission not in allowed_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} required",
            )

        return current_user

    return permission_checker


def require_role(role: Role) -> Callable:
    """Dependency factory to check if user has specific role."""

    async def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role_str = current_user.get("role")
        if user_role_str != role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role requirement not met: {role.value} required",
            )
        return current_user

    return role_checker

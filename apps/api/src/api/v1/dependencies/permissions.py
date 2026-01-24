"""Permission-based dependencies for RBAC."""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.permissions import ROLE_PERMISSIONS, Permission, Role
from src.models.admin_user import AdminUser


def require_permission(permission: Permission) -> Callable:
    """Dependency factory to check if user has required permission."""

    async def permission_checker(
        current_user: AdminUser = Depends(get_current_active_user),
    ) -> AdminUser:
        user_role_str = current_user.role
        try:
            # Handle case where role might be mocked or invalid
            user_role = Role(user_role_str)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user role configuration",
            ) from exc

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

    async def role_checker(current_user: AdminUser = Depends(get_current_active_user)) -> AdminUser:
        user_role_str = current_user.role
        if user_role_str != role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role requirement not met: {role.value} required",
            )
        return current_user

    return role_checker

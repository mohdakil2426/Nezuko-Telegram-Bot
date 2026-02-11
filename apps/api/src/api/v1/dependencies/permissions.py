"""Permission-based dependencies for owner-only access.

Since the dashboard is owner-only and authentication has been removed,
all permission checks simply return the owner identity.
This module is kept for API compatibility and future multi-user expansion.
"""

from collections.abc import Callable
from typing import Any

from fastapi import Depends

from src.api.v1.dependencies.session import OwnerIdentity, get_owner_identity
from src.core.permissions import Permission, Role

__all__ = ["Permission", "Role", "require_permission", "require_role"]


def require_permission(permission: Permission) -> Callable[..., Any]:
    """Dependency factory to check if user has required permission.

    NOTE: In the current owner-only setup, the owner has all permissions.
    This function exists for API compatibility and future multi-user expansion.

    Args:
        permission: Required permission (currently unused — owner has all).

    Returns:
        FastAPI dependency function.
    """

    async def permission_checker(
        owner: OwnerIdentity = Depends(get_owner_identity),
    ) -> OwnerIdentity:
        # Owner has all permissions in current implementation
        _ = permission  # Currently unused - owner has all permissions
        return owner

    return permission_checker


def require_role(role: Role) -> Callable[..., Any]:
    """Dependency factory to check if user has specific role.

    NOTE: In the current owner-only setup, the owner is implicitly 'super_admin'.
    This function exists for API compatibility and future multi-user expansion.

    Args:
        role: Required role (currently unused — owner is super_admin).

    Returns:
        FastAPI dependency function.
    """

    async def role_checker(
        owner: OwnerIdentity = Depends(get_owner_identity),
    ) -> OwnerIdentity:
        # Owner is implicitly super_admin in current implementation
        _ = role  # Currently unused - owner has all roles
        return owner

    return role_checker

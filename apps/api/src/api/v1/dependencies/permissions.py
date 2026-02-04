"""Permission-based dependencies for owner-only access.

Uses session-based authentication with Telegram Login Widget.
Since the dashboard is now owner-only, most endpoints use `require_owner` directly.
This module is kept for API compatibility and future multi-user expansion.
"""

from collections.abc import Callable
from typing import Any

from fastapi import Depends

from src.api.v1.dependencies.session import require_owner
from src.core.permissions import Permission, Role
from src.models.session import Session

__all__ = ["Permission", "Role", "require_permission", "require_role"]


def require_permission(permission: Permission) -> Callable[..., Any]:
    """Dependency factory to check if user has required permission.

    NOTE: In the current owner-only setup, the owner has all permissions.
    This function exists for API compatibility and future multi-user expansion.

    For most endpoints, use `require_owner` from session.py instead.
    """

    async def permission_checker(
        session: Session = Depends(require_owner),
    ) -> Session:
        # Owner has all permissions in current implementation
        # When multi-user is added, this will check against user roles
        _ = permission  # Currently unused - owner has all permissions
        return session

    return permission_checker


def require_role(role: Role) -> Callable[..., Any]:
    """Dependency factory to check if user has specific role.

    NOTE: In the current owner-only setup, the owner is implicitly 'super_admin'.
    This function exists for API compatibility and future multi-user expansion.

    For most endpoints, use `require_owner` from session.py instead.
    """

    async def role_checker(session: Session = Depends(require_owner)) -> Session:
        # Owner is implicitly super_admin in current implementation
        # When multi-user is added, this will check against user roles
        _ = role  # Currently unused - owner has all roles
        return session

    return role_checker

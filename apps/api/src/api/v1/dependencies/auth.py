"""Authentication dependencies - Compatibility layer.

This module provides backward-compatible imports for endpoints using
the legacy function names. All functions now use session-based
authentication internally (Telegram Login Widget).

New endpoints should import from `session.py` directly:
    from src.api.v1.dependencies.session import get_current_session, require_owner
"""

from src.api.v1.dependencies.session import (
    CurrentSession,
    OwnerSession,
    get_current_session,
    require_owner,
)

__all__ = [
    "CurrentSession",
    "OwnerSession",
    "get_current_active_user",
    "require_super_admin",
]


# Compatibility alias - maps old function name to new session-based auth
# Returns Session instead of AdminUser, but both have similar attributes
get_current_active_user = get_current_session

# Compatibility alias - super_admin is now just owner verification
require_super_admin = require_owner

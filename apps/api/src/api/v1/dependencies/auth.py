"""Authentication dependencies — Compatibility layer.

Authentication has been removed. All endpoints are open.
This module provides backward-compatible imports.

New endpoints should import from `session.py` directly:
    from src.api.v1.dependencies.session import get_owner_identity, CurrentOwner
"""

from src.api.v1.dependencies.session import (
    CurrentOwner,
    OwnerIdentity,
    get_owner_identity,
)

__all__ = [
    "CurrentOwner",
    "OwnerIdentity",
    "get_current_active_user",
    "get_owner_identity",
]

# Compatibility aliases for legacy endpoint imports
get_current_active_user = get_owner_identity
require_super_admin = get_owner_identity

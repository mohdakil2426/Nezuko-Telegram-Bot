"""RBAC permission and role definitions."""

from enum import Enum


class Role(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    VIEWER = "viewer"


class Permission(str, Enum):
    # Dashboard
    VIEW_DASHBOARD = "view:dashboard"

    # Groups
    MANAGE_GROUPS = "manage:groups"  # Create, Update, Delete
    VIEW_GROUPS = "view:groups"

    # Channels
    MANAGE_CHANNELS = "manage:channels"
    VIEW_CHANNELS = "view:channels"

    # Config
    VIEW_CONFIG = "view:config"
    MODIFY_CONFIG = "modify:config"

    # Database
    VIEW_DATABASE = "view:database"
    MODIFY_DATABASE = "modify:database"

    # Logs
    VIEW_LOGS = "view:logs"

    # Admins
    MANAGE_ADMINS = "manage:admins"

    # Audit
    VIEW_AUDIT_LOG = "view:audit_log"

    # Analytics
    VIEW_ANALYTICS = "view:analytics"


# Define permission matrix
ROLE_PERMISSIONS: dict[Role, list[Permission]] = {
    Role.OWNER: list(Permission),
    Role.ADMIN: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_GROUPS,
        Permission.VIEW_GROUPS,
        Permission.MANAGE_CHANNELS,
        Permission.VIEW_CHANNELS,
        Permission.VIEW_CONFIG,
        Permission.VIEW_LOGS,
        Permission.VIEW_AUDIT_LOG,
        Permission.VIEW_ANALYTICS,
    ],
    Role.VIEWER: [
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_GROUPS,
        Permission.VIEW_CHANNELS,
        Permission.VIEW_ANALYTICS,
    ],
}

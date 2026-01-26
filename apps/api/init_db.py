#!/usr/bin/env python3
"""Initialize the SQLite database with all required tables.

This script must modify sys.path before importing src modules.
Run: python init_db.py
"""
# ruff: noqa: E402
# pylint: disable=wrong-import-position

import asyncio
import sys
from pathlib import Path

# Add the src directory to the path BEFORE any src imports
sys.path.insert(0, str(Path(__file__).parent))

from src.core.database import engine

# Import ALL models to ensure they register with Base.metadata
# These imports have side effects (register tables) - they ARE used!
# pylint: disable=unused-import
from src.models import (  # noqa: F401
    AdminAuditLog,
    AdminConfig,
    AdminSession,
    AdminUser,
    VerificationLog,
)
from src.models.base import Base
from src.models.bot import (  # noqa: F401
    EnforcedChannel,
    GroupChannelLink,
    Owner,
    ProtectedGroup,
)

# pylint: enable=unused-import


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        # Create all tables registered with Base.metadata
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables created successfully!")
    print("📋 Admin Tables: admin_users, admin_audit_log, admin_sessions, admin_config")
    print("📋 Bot Tables: owners, protected_groups, enforced_channels, group_channel_links")
    print("📋 Analytics: verification_log")


if __name__ == "__main__":
    asyncio.run(init_db())

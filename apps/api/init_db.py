"""Initialize the SQLite database with all required tables."""

import asyncio
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.core.database import engine

# Import ALL models to ensure they register with Base.metadata
from src.models import AdminAuditLog, AdminConfig, AdminSession, AdminUser  # noqa: F401
from src.models.base import Base
from src.models.bot import EnforcedChannel, GroupChannelLink, Owner, ProtectedGroup  # noqa: F401


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables created successfully!")
    print("📋 Admin Tables: admin_users, admin_audit_log, admin_sessions, admin_config")
    print("📋 Bot Tables: owners, protected_groups, enforced_channels, group_channel_links")


if __name__ == "__main__":
    asyncio.run(init_db())

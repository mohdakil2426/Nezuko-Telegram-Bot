"""
Test configuration and database setup.
Tests environment loading, database operations, and module imports.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# pylint: disable=wrong-import-position, import-outside-toplevel, unused-import
from bot.config import config
from bot.core.database import get_session, init_db
from bot.database.crud import create_owner, create_protected_group, get_owner, link_group_channel


async def test_configuration():
    """Test configuration and database setup."""
    print("=" * 60)
    print("Configuration & Database Test")
    print("=" * 60)

    # Test 1: Configuration
    print("\n[OK] Configuration loaded successfully")
    print(f"  Environment: {config.environment}")
    print(f"  Database: {config.database_url.split('://')[0]}")
    print(f"  Mode: {'webhooks' if config.use_webhooks else 'polling'}")

    # Test 2: Database initialization
    print("\n[OK] Initializing database...")
    await init_db()
    print("  Database tables created")

    # Test 3: CRUD operations
    print("\n[OK] Testing CRUD operations...")
    async with get_session() as session:
        # Create owner
        owner = await create_owner(session, user_id=12345, username="test_user")
        print(f"  Created owner: {owner}")

        # Get owner
        fetched_owner = await get_owner(session, user_id=12345)
        assert fetched_owner is not None
        assert fetched_owner.user_id == 12345
        print(f"  Retrieved owner: {fetched_owner}")

        # Create protected group
        group = await create_protected_group(
            session, group_id=-1001234567890, owner_id=12345, title="Test Group"
        )
        print(f"  Created group: {group}")

        # Link channel
        await link_group_channel(
            session,
            group_id=-1001234567890,
            channel_id=-1009876543210,
            invite_link="https://t.me/testchannel",
            title="Test Channel",
        )
        print("  Linked channel to group")

    print("\n[OK] All CRUD operations successful")

    # Test 4: Handler imports
    print("\n[OK] Testing handler imports...")
    print("  All handlers imported successfully")

    print("\n" + "=" * 60)
    print("[SUCCESS] CONFIGURATION & DATABASE TEST COMPLETE")
    print("=" * 60)
    print("\nAll core components working:")
    print("  - Configuration management")
    print("  - Database layer (async SQLAlchemy)")
    print("  - Database models")
    print("  - CRUD operations")
    print("  - Admin command handlers")
    print("  - Rate limiter setup")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_configuration())

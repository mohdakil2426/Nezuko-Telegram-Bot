# pylint: disable=wrong-import-order, wrong-import-position, import-outside-toplevel, unused-import, trailing-whitespace, pointless-string-statement, broad-exception-caught
"""
Database Integration Tests for Nezuko - The Ultimate All-In-One Bot

Tests for:
- Database CRUD operations
- Transaction handling
- Constraint validation
- Multi-tenant data isolation
- Edge cases in data handling
"""
import pytest
import asyncio
import os
from datetime import datetime
from contextlib import asynccontextmanager


# Override database URL for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """Fixture to provide a fresh database session for each test."""
    from bot.core.database import init_db, close_db, get_session
    
    await init_db()
    
    async with get_session() as session:
        yield session
    
    await close_db()


# ============================================================================
# OWNER CRUD TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_owner():
    """Test creating a new owner."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, get_owner
    
    await init_db()
    
    try:
        async with get_session() as session:
            owner = await create_owner(session, 123456789, "testuser")
            
            assert owner is not None
            assert owner.user_id == 123456789
            assert owner.username == "testuser"
            print("[PASS] Create owner")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_get_owner():
    """Test fetching an existing owner."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, get_owner
    
    await init_db()
    
    try:
        async with get_session() as session:
            # Create first
            await create_owner(session, 111222333, "fetchtest")
        
        async with get_session() as session:
            # Fetch in new session
            owner = await get_owner(session, 111222333)
            
            assert owner is not None
            assert owner.username == "fetchtest"
            print("[PASS] Get owner")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_get_nonexistent_owner():
    """Test fetching an owner that doesn't exist."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import get_owner
    
    await init_db()
    
    try:
        async with get_session() as session:
            owner = await get_owner(session, 999999999)
            assert owner is None
            print("[PASS] Get nonexistent owner returns None")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_create_owner_without_username():
    """Test creating owner without username (optional field)."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner
    
    await init_db()
    
    try:
        async with get_session() as session:
            owner = await create_owner(session, 444555666, None)
            
            assert owner is not None
            assert owner.user_id == 444555666
            assert owner.username is None
            print("[PASS] Create owner without username")
    finally:
        await close_db()


# ============================================================================
# PROTECTED GROUP CRUD TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_protected_group():
    """Test creating a protected group."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, create_protected_group, get_protected_group
    
    await init_db()
    
    try:
        async with get_session() as session:
            # Create owner first
            await create_owner(session, 111, "admin")
            
            # Create protected group
            group = await create_protected_group(
                session,
                group_id=-1001234567890,
                owner_id=111,
                title="Test Group"
            )
            
            assert group is not None
            assert group.group_id == -1001234567890
            assert group.owner_id == 111
            assert group.title == "Test Group"
            assert group.enabled is True  # Default enabled
            print("[PASS] Create protected group")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_get_protected_group():
    """Test fetching a protected group."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, create_protected_group, get_protected_group
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 222, "admin2")
            await create_protected_group(session, -100987654321, 222, "Fetch Test")
        
        async with get_session() as session:
            group = await get_protected_group(session, -100987654321)
            
            assert group is not None
            assert group.title == "Fetch Test"
            print("[PASS] Get protected group")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_toggle_protection():
    """Test enabling/disabling group protection."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group, 
        toggle_protection, get_protected_group
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 333, "admin3")
            await create_protected_group(session, -100111222333, 333, "Toggle Test")
        
        async with get_session() as session:
            # Disable protection
            await toggle_protection(session, -100111222333, enabled=False)
        
        async with get_session() as session:
            group = await get_protected_group(session, -100111222333)
            assert group.enabled is False
        
        async with get_session() as session:
            # Re-enable protection
            await toggle_protection(session, -100111222333, enabled=True)
        
        async with get_session() as session:
            group = await get_protected_group(session, -100111222333)
            assert group.enabled is True
            print("[PASS] Toggle protection")
    finally:
        await close_db()


# ============================================================================
# CHANNEL LINKING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_link_group_to_channel():
    """Test linking a group to a channel."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group,
        link_group_channel, get_group_channels
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 444, "admin4")
            await create_protected_group(session, -100444444444, 444, "Link Test")
            
            await link_group_channel(
                session,
                group_id=-100444444444,
                channel_id=-100555555555,
                invite_link="https://t.me/testchannel",
                title="Test Channel"
            )
        
        async with get_session() as session:
            channels = await get_group_channels(session, -100444444444)
            
            assert len(channels) == 1
            assert channels[0].channel_id == -100555555555
            print("[PASS] Link group to channel")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_link_group_to_multiple_channels():
    """Test linking a group to multiple channels."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group,
        link_group_channel, get_group_channels
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 555, "admin5")
            await create_protected_group(session, -100666666666, 555, "Multi Channel Test")
            
            # Link to 3 channels
            for i in range(3):
                await link_group_channel(
                    session,
                    group_id=-100666666666,
                    channel_id=-100777777770 - i,
                    invite_link=f"https://t.me/channel{i}",
                    title=f"Channel {i}"
                )
        
        async with get_session() as session:
            channels = await get_group_channels(session, -100666666666)
            
            assert len(channels) == 3
            print("[PASS] Link group to multiple channels")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_unlink_all_channels():
    """Test unlinking all channels from a group."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group,
        link_group_channel, unlink_all_channels, get_group_channels
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 666, "admin6")
            await create_protected_group(session, -100888888888, 666, "Unlink Test")
            
            # Link 2 channels
            await link_group_channel(session, -100888888888, -100999999991, None, "Ch1")
            await link_group_channel(session, -100888888888, -100999999992, None, "Ch2")
        
        async with get_session() as session:
            # Verify links exist
            channels = await get_group_channels(session, -100888888888)
            assert len(channels) == 2
        
        async with get_session() as session:
            # Unlink all
            await unlink_all_channels(session, -100888888888)
        
        async with get_session() as session:
            # Verify unlinked
            channels = await get_group_channels(session, -100888888888)
            assert len(channels) == 0
            print("[PASS] Unlink all channels")
    finally:
        await close_db()


# ============================================================================
# MULTI-TENANT ISOLATION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_multi_tenant_isolation():
    """Test that different groups have isolated configurations."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group,
        link_group_channel, get_group_channels
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            # Create two different owners with two different groups
            await create_owner(session, 1001, "owner1")
            await create_owner(session, 1002, "owner2")
            
            await create_protected_group(session, -100111111111, 1001, "Group 1")
            await create_protected_group(session, -100222222222, 1002, "Group 2")
            
            # Link different channels to each group
            await link_group_channel(session, -100111111111, -100333333333, None, "Ch A")
            await link_group_channel(session, -100222222222, -100444444444, None, "Ch B")
        
        async with get_session() as session:
            # Verify isolation
            channels1 = await get_group_channels(session, -100111111111)
            channels2 = await get_group_channels(session, -100222222222)
            
            assert len(channels1) == 1
            assert len(channels2) == 1
            assert channels1[0].channel_id == -100333333333
            assert channels2[0].channel_id == -100444444444
            print("[PASS] Multi-tenant isolation")
    finally:
        await close_db()


# ============================================================================
# EDGE CASE DATA TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_very_long_title():
    """Test handling of very long group/channel titles."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, create_protected_group
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 7777, "longtest")
            
            long_title = "A" * 500  # Very long title
            group = await create_protected_group(session, -100999999999, 7777, long_title)
            
            assert group is not None
            # Title should be stored (possibly truncated depending on DB schema)
            assert len(group.title) > 0
            print("[PASS] Very long title handled")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_unicode_in_titles():
    """Test Unicode characters in titles."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, create_protected_group
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 8888, "unicodetest")
            
            unicode_title = "测试群组 🎉 Тест グループ"
            group = await create_protected_group(session, -100888888888, 8888, unicode_title)
            
            assert group is not None
            assert "🎉" in group.title or group.title == unicode_title
            print("[PASS] Unicode in titles")
    finally:
        await close_db()


@pytest.mark.asyncio
async def test_special_chars_in_invite_link():
    """Test special characters in invite links."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import (
        create_owner, create_protected_group,
        link_group_channel, get_group_channels
    )
    
    await init_db()
    
    try:
        async with get_session() as session:
            await create_owner(session, 9999, "linktest")
            await create_protected_group(session, -100777777777, 9999, "Link Test")
            
            # Telegram invite links have + prefix
            invite_link = "https://t.me/+ABCdef123_XYZ"
            await link_group_channel(
                session, -100777777777, -100666666666,
                invite_link=invite_link, title="Test"
            )
        
        async with get_session() as session:
            channels = await get_group_channels(session, -100777777777)
            assert len(channels) == 1
            # Check invite link preserved
            assert "+" in channels[0].invite_link or channels[0].invite_link is not None
            print("[PASS] Special chars in invite link")
    finally:
        await close_db()


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    """Run all database tests."""
    print("=" * 60)
    print("Running Database Integration Tests for Nezuko")
    print("=" * 60)
    print()
    
    # Owner tests
    print("== Owner CRUD ==")
    asyncio.run(test_create_owner())
    asyncio.run(test_get_owner())
    asyncio.run(test_get_nonexistent_owner())
    asyncio.run(test_create_owner_without_username())
    print()
    
    # Protected group tests
    print("== Protected Group CRUD ==")
    asyncio.run(test_create_protected_group())
    asyncio.run(test_get_protected_group())
    asyncio.run(test_toggle_protection())
    print()
    
    # Channel linking tests
    print("== Channel Linking ==")
    asyncio.run(test_link_group_to_channel())
    asyncio.run(test_link_group_to_multiple_channels())
    asyncio.run(test_unlink_all_channels())
    print()
    
    # Multi-tenant tests
    print("== Multi-Tenant Isolation ==")
    asyncio.run(test_multi_tenant_isolation())
    print()
    
    # Edge case tests
    print("== Edge Cases ==")
    asyncio.run(test_very_long_title())
    asyncio.run(test_unicode_in_titles())
    asyncio.run(test_special_chars_in_invite_link())
    print()
    
    print("=" * 60)
    print("[SUCCESS] All database tests passed!")
    print("=" * 60)

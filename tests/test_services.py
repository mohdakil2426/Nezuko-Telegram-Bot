# pylint: disable=wrong-import-order, wrong-import-position, import-outside-toplevel, unused-import, trailing-whitespace, pointless-string-statement, broad-exception-caught, unused-argument, logging-fstring-interpolation
"""
Unit tests for bot services.

Tests for verification service, protection service, and cache operations.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_cache_ttl_jitter():
    """Test TTL jitter prevents thundering herd."""
    from bot.core.cache import get_ttl_with_jitter
    
    # Test with 600s base TTL
    results = [get_ttl_with_jitter(600, 15) for _ in range(100)]
    
    # All should be within ±15% of 600 (510-690)
    assert all(510 <= r <= 690 for r in results)
    
    # Should have variety (not all the same)
    assert len(set(results)) > 10
    
    print(f"[OK] TTL jitter working: {min(results)}s - {max(results)}s (base: 600s)")


@pytest.mark.asyncio
async def test_verification_service_cache_logic():
    """Test verification service uses cache before API."""
    from bot.services.verification import check_membership
    from telegram.constants import ChatMemberStatus
    from tests.utils import create_mock_context
    
    # Mock context
    context = create_mock_context(user_status=ChatMemberStatus.MEMBER)
    
    # Mock cache (return None = cache miss)
    with patch('bot.services.verification.cache_get', new_callable=AsyncMock) as mock_cache_get, \
         patch('bot.services.verification.cache_set', new_callable=AsyncMock) as mock_cache_set:
        
        mock_cache_get.return_value = None  # Cache miss
        
        # First call - should hit API
        result = await check_membership(123, "@testchannel", context)
        
        assert result is True
        mock_cache_get.assert_called_once()
        context.bot.get_chat_member.assert_called_once()
        mock_cache_set.assert_called_once()
        
        print("[OK] Verification service: cache miss -> API call -> cache set")


@pytest.mark.asyncio
async def test_protection_service_retry_logic():
    """Test protection service retries on transient failures."""
    from bot.services.protection import restrict_user
    from telegram.error import TelegramError
    
    # Mock context that fails twice then succeeds
    context = MagicMock()
    call_count = 0
    
    async def mock_restrict(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise TelegramError("Transient error")
        return True
    
    context.bot.restrict_chat_member = AsyncMock(side_effect=mock_restrict)
    
    # Should retry and eventually succeed
    result = await restrict_user(123, 456, context)
    
    assert result is True
    assert call_count == 3  # Failed 2 times, succeeded on 3rd
    
    print("[OK] Protection service: retries on failure (3 attempts)")


@pytest.mark.asyncio
async def test_cache_graceful_degradation():
    """Test cache gracefully degrades when Redis unavailable."""
    from bot.core.cache import cache_get, cache_set
    
    # Simulate Redis unavailable
    with patch('bot.core.cache._redis_available', False), \
         patch('bot.core.cache._redis_client', None):
        
        # Should return None without crashing
        result = await cache_get("test_key")
        assert result is None
        
        # Should return False without crashing
        success = await cache_set("test_key", "value", 60)
        assert success is False
        
        print("[OK] Cache: graceful degradation works (no crash when Redis down)")


def test_protection_stats_tracking():
    """Test protection service tracks mute/unmute stats."""
    from bot.services.protection import get_protection_stats, reset_protection_stats
    
    # Reset first
    reset_protection_stats()
    
    stats = get_protection_stats()
    assert stats["mute_count"] == 0
    assert stats["unmute_count"] == 0
    assert stats["error_count"] == 0
    
    print("[OK] Protection stats: tracking initialized correctly")


def test_verification_stats_tracking():
    """Test verification service tracks cache stats."""
    from bot.services.verification import get_cache_stats, reset_cache_stats
    
    # Reset first
    reset_cache_stats()
    
    stats = get_cache_stats()
    assert stats["cache_hits"] == 0
    assert stats["cache_misses"] == 0
    assert stats["hit_rate_percent"] == 0.0
    
    print("[OK] Verification stats: tracking initialized correctly")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_database_crud_operations():
    """Test basic CRUD operations (integration test)."""
    from bot.core.database import init_db, close_db, get_session
    from bot.database.crud import create_owner, get_owner
    
    # Initialize test database (SQLite)
    import os
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
    
    await init_db()
    
    try:
        async with get_session() as session:
            # Create owner
            owner = await create_owner(session, 12345, "testuser")
            assert owner.user_id == 12345
            
            # Get owner
            fetched = await get_owner(session, 12345)
            assert fetched is not None
            assert fetched.username == "testuser"
        
        print("[OK] Database CRUD: create and get operations work")
    finally:
        await close_db()


if __name__ == "__main__":
    """Run tests manually without pytest."""
    print("Running Service Unit Tests...\n")
    
    # Run async tests
    asyncio.run(test_cache_ttl_jitter())
    asyncio.run(test_verification_service_cache_logic())
    asyncio.run(test_protection_service_retry_logic())
    asyncio.run(test_cache_graceful_degradation())
    
    # Run sync tests
    test_protection_stats_tracking()
    test_verification_stats_tracking()
    
    print("\n[SUCCESS] All service tests passed!")
    print("\nTo run integration tests: pytest tests/test_services.py -m integration")

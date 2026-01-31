# 13. Testing Strategy (pytest-asyncio, Isolation)

## Async Test Setup & Fixtures

**RULE: Use `pytest-asyncio` with `asyncio_mode = auto`. Proper fixture scope prevents test pollution.**

```python
# ✅ CORRECT: pytest.ini configuration
[pytest]
asyncio_mode = auto
asyncio_default_fixture_scope = function

# ✅ CORRECT: Async test fixtures
import pytest
from pytest_asyncio import fixture

@fixture(scope="function")
async def db_session():
    """Fresh database session per test."""
    async with AsyncSessionLocal() as session:
        async with session.begin_nested():
            yield session
            # Rollback after test
    await session.close()

@fixture(scope="function")
async def client(db_session):
    """FastAPI test client with mocked database."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@fixture(scope="function")
async def mock_firebase():
    """Mocked Firebase Admin SDK."""
    with mock.patch("firebase_admin.db") as mock_db:
        yield mock_db

# ✅ CORRECT: Async test
@pytest.mark.asyncio
async def test_get_user(client, db_session):
    user = User(id="test-user", email="test@example.com", tenant_id="test-tenant")
    db_session.add(user)
    await db_session.commit()
    
    response = await client.get("/users/test-user")
    
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

# ❌ WRONG: Sync test with async code
def test_get_user(client):
    # Can't await here
    response = client.get("/users/test-user")

# ❌ WRONG: Fixture scope too broad (test pollution)
@fixture(scope="session")
async def db_session():
    # Changes in one test affect all tests
    pass

# ❌ WRONG: Not rolling back transactions
@fixture(scope="function")
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        # No cleanup—data persists to next test
```

## Test Isolation & Transaction Cleanup

**RULE: Each test must start clean. Use transaction rollback or database reset.**

```python
# ✅ CORRECT: Savepoint rollback per test
@fixture(scope="function")
async def db_with_savepoint():
    async with AsyncSessionLocal() as session:
        async with session.begin_nested() as savepoint:
            yield session
            # Savepoint rolls back automatically
        await session.close()

# ✅ CORRECT: Explicit cleanup
@fixture(scope="function", autouse=True)
async def cleanup_after_test():
    yield
    # Cleanup here
    await db.delete_all_test_data()

# ✅ CORRECT: Isolated Redis for tests
@fixture(scope="function")
async def redis_client():
    redis = await aioredis.create_redis_pool("redis://localhost", db=15)
    await redis.flushdb()
    
    yield redis
    
    redis.close()
    await redis.wait_closed()

# ❌ WRONG: Shared database state
@fixture(scope="session")
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
    # Tests modify same data, causing flakiness

# ❌ WRONG: No cleanup
@fixture(scope="function")
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
    # Data persists; next test sees previous test's data
```

## Mocking Async Dependencies

**RULE: Mock external services (Firebase, Telegram, APIs). Use `AsyncMock` for async functions.**

```python
# ✅ CORRECT: Mock async Firebase calls
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_create_user():
    with patch("firebase_admin.auth.create_user", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value.uid = "test-uid"
        
        user = await create_user("test@example.com", "password")
        
        assert user.id == "test-uid"
        mock_auth.assert_called_once()

# ✅ CORRECT: Mock Telegram client
@pytest.mark.asyncio
async def test_send_message():
    with patch("telegram.Bot.send_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = mock.MagicMock(message_id=123)
        
        await bot.send_message(chat_id="123", text="Hello")
        
        assert mock_send.call_count == 1

# ✅ CORRECT: Context manager for fixtures
@fixture
async def mock_db():
    with patch("app.db.get_user", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = User(id="test", email="test@example.com")
        yield mock_get

# ❌ WRONG: Mock sync function instead of async
with patch("async_function", Mock()):  # Wrong—won't work
    await async_function()

# ❌ WRONG: No await on async mock
mock_func = AsyncMock(return_value="result")
mock_func()  # Missing await

result = mock_func()  # This returns a coroutine, not the result
```

## Parametrized Tests

**RULE: Use parametrize for testing multiple scenarios with same logic.**

```python
# ✅ CORRECT: Parametrized tests
@pytest.mark.asyncio
@pytest.mark.parametrize("user_role,endpoint,expected_status", [
    (UserRole.ADMIN, "/users/list", 200),
    (UserRole.MODERATOR, "/users/list", 200),
    (UserRole.USER, "/users/list", 403),
])
async def test_user_access(client, user_role, endpoint, expected_status):
    user = create_user(role=user_role)
    token = create_token(user)
    
    response = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == expected_status

# ✅ CORRECT: Parametrized edge cases
@pytest.mark.parametrize("input_value,expected", [
    ("", ValueError),
    ("valid@example.com", None),
    ("@example.com", ValueError),
    ("user@", ValueError),
])
def test_email_validation(input_value, expected):
    if expected:
        with pytest.raises(expected):
            validate_email(input_value)
    else:
        assert validate_email(input_value)

# ❌ WRONG: Repeated test logic
async def test_admin_list_users(client):
    response = await client.get("/users/list", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200

async def test_moderator_list_users(client):
    response = await client.get("/users/list", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200

async def test_user_list_users(client):
    response = await client.get("/users/list", headers={"Authorization": "Bearer token"})
    assert response.status_code == 403
```

## Error Condition Testing

**RULE: Test error paths. Check that exceptions are handled correctly, not just happy paths.**

```python
# ✅ CORRECT: Test error handling
@pytest.mark.asyncio
async def test_get_user_not_found(client, db_session):
    response = await client.get("/users/nonexistent")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

@pytest.mark.asyncio
async def test_create_user_duplicate_email(client, db_session):
    user = User(id="test", email="test@example.com", tenant_id="test-tenant")
    db_session.add(user)
    await db_session.commit()
    
    response = await client.post("/users", json={"email": "test@example.com"})
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

# ✅ CORRECT: Test timeout handling
@pytest.mark.asyncio
async def test_external_call_timeout(client, mock_api):
    mock_api.side_effect = asyncio.TimeoutError()
    
    with pytest.raises(HTTPException) as exc_info:
        await get_data_from_api()
    
    assert exc_info.value.status_code == 503

# ❌ WRONG: Only test happy path
@pytest.mark.asyncio
async def test_get_user(client):
    response = await client.get("/users/test-user")
    assert response.status_code == 200
    # No test for 404, 500, etc.

# ❌ WRONG: Swallow exceptions in tests
@pytest.mark.asyncio
async def test_something(client):
    try:
        result = await client.get("/endpoint")
    except Exception:
        pass  # Silent failure
```

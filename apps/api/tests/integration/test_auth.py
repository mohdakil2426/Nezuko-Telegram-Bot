import pytest
from httpx import AsyncClient
from src.core.security import hash_password
from src.models.admin_user import AdminUser


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, session):
    # Setup user
    password = "StrongPassword123!"
    user = AdminUser(
        email="test@nezuko.bot",
        password_hash=hash_password(password),
        full_name="Test User",
        role="owner",
        is_active=True,
    )
    session.add(user)
    await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@nezuko.bot", "password": password},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies  # Check cookie set


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, session):
    password = "StrongPassword123!"
    user = AdminUser(email="test2@nezuko.bot", password_hash=hash_password(password), role="owner")
    session.add(user)
    await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test2@nezuko.bot", "password": "WrongPassword"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_flow(client: AsyncClient, session):
    # Setup user
    password = "StrongPassword123!"
    user = AdminUser(
        email="refresh@nezuko.bot",
        password_hash=hash_password(password),
        role="admin",
    )
    session.add(user)
    await session.commit()

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@nezuko.bot", "password": password},
    )
    refresh_token = login_res.cookies["refresh_token"]

    # Refresh
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_token},
    )

    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" in data
    new_refresh_token = refresh_res.cookies["refresh_token"]
    assert new_refresh_token != refresh_token  # Rotation check


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient, session):
    # Setup user and get token
    password = "StrongPassword123!"
    user = AdminUser(
        email="me@nezuko.bot",
        password_hash=hash_password(password),
        full_name="Me User",
        role="viewer",
    )
    session.add(user)
    await session.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "me@nezuko.bot", "password": password},
    )
    login_res.json()["access_token"]

    # Call /me (which doesn't exist yet? Wait, get_current_user logic implies protected endpoints)
    # I didn't verify if /auth/me exists in endpoints/auth.py.
    # Checking endpoints/auth.py content...

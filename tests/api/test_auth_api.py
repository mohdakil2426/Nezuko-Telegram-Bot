"""Integration tests for Authentication API."""

# pylint: disable=wrong-import-position, invalid-name, import-outside-toplevel

# Import app from source
import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))
from src.core.config import get_settings
from src.main import app


@pytest.fixture
async def client():
    """Create async test client."""
    # Force Mock Auth OFF for these tests to verify security
    settings = get_settings()
    original_mock_auth = settings.MOCK_AUTH
    settings.MOCK_AUTH = False  # Enforce real auth logic (which triggers 401/403)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Restore setting
    settings.MOCK_AUTH = original_mock_auth


@pytest.mark.asyncio
async def test_auth_flow(client):
    """Test authentication endpoints flow."""

    # 1. Unauthenticated Access
    print("\n--- Testing Unauthenticated Access ---")
    resp = await client.get("/api/v1/auth/me")
    print(f"Status /auth/me (no token): {resp.status_code}")
    assert resp.status_code == 401, "Should be unauthorized without token"

    # 2. Invalid Token Access
    print("\n--- Testing Invalid Token Access ---")
    headers = {"Authorization": "Bearer mock_token"}
    # Note: Using /auth/me as /auth/sync might require POST body or other dependencies
    resp = await client.get("/api/v1/auth/me", headers=headers)
    print(f"Status /auth/me (invalid token): {resp.status_code}")

    # With MOCK_AUTH=False, and invalid token, verify_jwt raises exception -> 401.
    assert resp.status_code == 401, "Should be unauthorized with invalid token"

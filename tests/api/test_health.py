"""Health check endpoint tests.

Tests the /health endpoint for basic functionality and graceful error handling.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    """Test that GET /health returns 200 OK."""
    response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_includes_status(client: AsyncClient) -> None:
    """Test that GET /health includes status field."""
    response = await client.get("/health")
    data = response.json()

    assert "status" in data
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_includes_version(client: AsyncClient) -> None:
    """Test that GET /health includes version field."""
    response = await client.get("/health")
    data = response.json()

    assert "version" in data
    assert isinstance(data["version"], str)


@pytest.mark.asyncio
async def test_health_response_structure(client: AsyncClient) -> None:
    """Test that GET /health returns expected structure."""
    response = await client.get("/health")
    data = response.json()

    # Basic structure validation
    assert isinstance(data, dict)
    assert "status" in data
    assert "version" in data

    # Values validation
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_health_no_auth_required(client: AsyncClient) -> None:
    """Test that GET /health does not require authentication."""
    response = await client.get("/health")

    # Should not return 401 or 403
    assert response.status_code == 200
    assert response.status_code not in (401, 403)

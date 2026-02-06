"""Chart endpoints integration tests.

Tests all 10 chart API endpoints with empty and sample data scenarios.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_verification_distribution_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/verification-distribution returns 200."""
    response = await client.get("/api/v1/charts/verification-distribution")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_verification_distribution_structure(client: AsyncClient) -> None:
    """Test verification distribution response structure."""
    response = await client.get("/api/v1/charts/verification-distribution")
    data = response.json()["data"]

    # Check expected fields exist
    assert "verified" in data
    assert "restricted" in data
    assert "error" in data
    assert "total" in data

    # All should be integers
    assert isinstance(data["verified"], int)
    assert isinstance(data["restricted"], int)
    assert isinstance(data["error"], int)
    assert isinstance(data["total"], int)


@pytest.mark.asyncio
async def test_cache_breakdown_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/cache-breakdown returns 200."""
    response = await client.get("/api/v1/charts/cache-breakdown")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_cache_breakdown_structure(client: AsyncClient) -> None:
    """Test cache breakdown response structure."""
    response = await client.get("/api/v1/charts/cache-breakdown")
    data = response.json()["data"]

    assert "cached" in data
    assert "api" in data
    assert "total" in data
    assert "hit_rate" in data


@pytest.mark.asyncio
async def test_groups_status_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/groups-status returns 200."""
    response = await client.get("/api/v1/charts/groups-status")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_groups_status_structure(client: AsyncClient) -> None:
    """Test groups status response structure."""
    response = await client.get("/api/v1/charts/groups-status")
    data = response.json()["data"]

    assert "active" in data
    assert "inactive" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_api_calls_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/api-calls returns 200."""
    response = await client.get("/api/v1/charts/api-calls")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_hourly_activity_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/hourly-activity returns 200."""
    response = await client.get("/api/v1/charts/hourly-activity")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_hourly_activity_has_24_hours(client: AsyncClient) -> None:
    """Test hourly activity returns 24 hour entries."""
    response = await client.get("/api/v1/charts/hourly-activity")
    data = response.json()["data"]

    assert len(data) == 24

    # Verify each entry has required fields
    for entry in data:
        assert "hour" in entry
        assert "label" in entry
        assert "verifications" in entry
        assert "restrictions" in entry


@pytest.mark.asyncio
async def test_latency_distribution_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/latency-distribution returns 200."""
    response = await client.get("/api/v1/charts/latency-distribution")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_top_groups_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/top-groups returns 200."""
    response = await client.get("/api/v1/charts/top-groups")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_top_groups_limit_parameter(client: AsyncClient) -> None:
    """Test top groups respects limit parameter."""
    response = await client.get("/api/v1/charts/top-groups?limit=5")

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) <= 5


@pytest.mark.asyncio
async def test_top_groups_limit_validation(client: AsyncClient) -> None:
    """Test top groups rejects invalid limit values."""
    # Limit too high
    response = await client.get("/api/v1/charts/top-groups?limit=100")
    assert response.status_code == 422  # Validation error

    # Limit too low
    response = await client.get("/api/v1/charts/top-groups?limit=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_cache_hit_rate_trend_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/cache-hit-rate-trend returns 200."""
    response = await client.get("/api/v1/charts/cache-hit-rate-trend")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_cache_hit_rate_trend_period_parameter(client: AsyncClient) -> None:
    """Test cache hit rate trend with different periods."""
    periods = ["7d", "30d", "90d"]

    for period in periods:
        response = await client.get(f"/api/v1/charts/cache-hit-rate-trend?period={period}")
        assert response.status_code == 200

        data = response.json()["data"]
        assert data["period"] == period


@pytest.mark.asyncio
async def test_latency_trend_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/latency-trend returns 200."""
    response = await client.get("/api/v1/charts/latency-trend")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_latency_trend_period_parameter(client: AsyncClient) -> None:
    """Test latency trend with different periods."""
    periods = ["7d", "30d", "90d"]

    for period in periods:
        response = await client.get(f"/api/v1/charts/latency-trend?period={period}")
        assert response.status_code == 200

        data = response.json()["data"]
        assert data["period"] == period


@pytest.mark.asyncio
async def test_bot_health_returns_200(client: AsyncClient) -> None:
    """Test GET /api/v1/charts/bot-health returns 200."""
    response = await client.get("/api/v1/charts/bot-health")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_bot_health_structure(client: AsyncClient) -> None:
    """Test bot health response structure."""
    response = await client.get("/api/v1/charts/bot-health")
    data = response.json()["data"]

    expected_fields = [
        "uptime_percent",
        "cache_efficiency",
        "success_rate",
        "avg_latency_score",
        "error_rate",
        "overall_score",
    ]

    for field in expected_fields:
        assert field in data
        # All health metrics should be floats
        assert isinstance(data[field], (int, float))


@pytest.mark.asyncio
async def test_all_chart_endpoints_require_auth_disabled_for_mock() -> None:
    """Note: With MOCK_AUTH=true, auth is bypassed in tests.

    In production, all chart endpoints require authentication.
    This test documents the behavior.
    """
    # This is a documentation test - auth is tested in test_auth_api.py
    # With MOCK_AUTH=true in conftest.py, all endpoints return mock user
    assert True  # Document that auth testing is in separate module

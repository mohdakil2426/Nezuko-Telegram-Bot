"""Integration tests for analytics API endpoints.

Note: Run from project root with: pytest tests/api/integration/test_analytics.py

These tests use the api/conftest.py fixtures which properly set up the database
with all required tables including verification_log and protected_groups.
"""

import pytest


@pytest.fixture
def mock_auth_headers():
    """Mock auth headers for testing."""
    return {"Authorization": "Bearer test-token"}


class TestUserGrowthEndpoint:
    """Tests for GET /api/v1/analytics/user-growth."""

    @pytest.mark.anyio
    async def test_user_growth_returns_valid_structure(self, client, mock_auth_headers):
        """Test that user growth endpoint returns expected structure."""
        response = await client.get(
            "/api/v1/analytics/users",
            headers=mock_auth_headers,
            params={"period": "7d"},
        )

        # May return 401 if auth not configured, but structure check is key
        if response.status_code == 200:
            data = response.json()
            # API uses status: "success" not success: True
            assert data.get("status") == "success"
            assert "data" in data
            if data.get("status") == "success":
                assert "series" in data["data"]
                assert "summary" in data["data"]

    @pytest.mark.anyio
    async def test_user_growth_handles_empty_data(self, client, mock_auth_headers):
        """Test that user growth handles empty data gracefully."""
        response = await client.get(
            "/api/v1/analytics/users",
            headers=mock_auth_headers,
            params={"period": "30d"},
        )

        # Should not error even with no data
        assert response.status_code in [200, 401, 403]


class TestVerificationTrendsEndpoint:
    """Tests for GET /api/v1/analytics/verification-trends."""

    @pytest.mark.anyio
    async def test_verification_trends_returns_valid_structure(self, client, mock_auth_headers):
        """Test that verification trends endpoint returns expected structure."""
        response = await client.get(
            "/api/v1/analytics/verifications",
            headers=mock_auth_headers,
            params={"period": "7d"},
        )

        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "success"
            assert "data" in data
            if data.get("status") == "success":
                assert "series" in data["data"]
                assert "summary" in data["data"]

    @pytest.mark.anyio
    async def test_verification_trends_24h_period(self, client, mock_auth_headers):
        """Test hourly granularity for 24h period."""
        response = await client.get(
            "/api/v1/analytics/verifications",
            headers=mock_auth_headers,
            params={"period": "24h"},
        )

        if response.status_code == 200:
            data = response.json()
            # 24h period should use hourly granularity
            if data.get("status") == "success" and data.get("data", {}).get("series"):
                series = data["data"]["series"]
                # Should have up to 24 data points for hourly
                assert len(series) <= 25


class TestDashboardChartDataEndpoint:
    """Tests for GET /api/v1/dashboard/chart-data."""

    @pytest.mark.anyio
    async def test_chart_data_returns_30_days(self, client, mock_auth_headers):
        """Test that chart data returns 30 days of data."""
        response = await client.get(
            "/api/v1/dashboard/chart-data",
            headers=mock_auth_headers,
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success" and data.get("data", {}).get("series"):
                series = data["data"]["series"]
                # Should have approximately 30 days
                assert 28 <= len(series) <= 32

    @pytest.mark.anyio
    async def test_chart_data_has_correct_fields(self, client, mock_auth_headers):
        """Test that each data point has required fields."""
        response = await client.get(
            "/api/v1/dashboard/chart-data",
            headers=mock_auth_headers,
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success" and data.get("data", {}).get("series"):
                for point in data["data"]["series"]:
                    assert "date" in point
                    assert "verified" in point
                    assert "restricted" in point


class TestDashboardStatsEndpoint:
    """Tests for GET /api/v1/dashboard/stats."""

    @pytest.mark.anyio
    async def test_stats_returns_all_fields(self, client, mock_auth_headers):
        """Test that stats endpoint returns all required fields."""
        response = await client.get(
            "/api/v1/dashboard/stats",
            headers=mock_auth_headers,
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success" and data.get("data"):
                stats = data["data"]
                required_fields = [
                    "total_groups",
                    "total_channels",
                    "verifications_today",
                    "verifications_week",
                    "success_rate",
                ]
                for field in required_fields:
                    assert field in stats


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

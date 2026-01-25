"""Unit tests for Supabase security."""

from unittest.mock import Mock, patch

import pytest
from src.core.security import verify_supabase_token


def test_verify_supabase_token_valid():
    """Test verify_supabase_token with valid token."""
    mock_client = Mock()
    mock_response = Mock()
    mock_user = Mock()
    mock_user.email = "test@example.com"
    mock_response.user = mock_user
    mock_client.auth.get_user.return_value = mock_response

    with patch("src.core.security.get_supabase_client", return_value=mock_client):
        user = verify_supabase_token("valid_token")
        assert user.email == "test@example.com"


def test_verify_supabase_token_invalid():
    """Test verify_supabase_token with invalid token."""
    mock_client = Mock()
    # Mock exception from Supabase client
    mock_client.auth.get_user.side_effect = Exception("Invalid token")

    with patch("src.core.security.get_supabase_client", return_value=mock_client):
        try:
            verify_supabase_token("invalid_token")
            pytest.fail("Should have raised exception")
        except Exception:
            assert True

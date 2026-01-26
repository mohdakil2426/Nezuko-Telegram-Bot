"""Unit tests for Supabase security."""

from unittest.mock import patch

import pytest
from jwt import PyJWTError
from src.core.security import verify_jwt


def test_verify_jwt_valid():
    """Test verify_jwt with valid token."""
    mock_payload = {
        "sub": "test_uid",
        "email": "test@example.com",
        "role": "authenticated",
        "user_metadata": {"full_name": "Test User"},
    }

    # Mock settings to ensure secret is present
    with patch("src.core.security.settings") as mock_settings:
        mock_settings.SUPABASE_JWT_SECRET = "test_secret"

        with patch("jwt.decode", return_value=mock_payload):
            user = verify_jwt("valid_token")
            assert user["email"] == "test@example.com"
            assert user["uid"] == "test_uid"
            assert user["name"] == "Test User"
            assert user["role"] == "authenticated"


def test_verify_jwt_invalid():
    """Test verify_jwt with invalid token."""
    # Mock settings
    with patch("src.core.security.settings") as mock_settings:
        mock_settings.SUPABASE_JWT_SECRET = "test_secret"

        with patch("jwt.decode", side_effect=PyJWTError("Invalid signature")):
            with pytest.raises(ValueError, match="Invalid token"):
                verify_jwt("invalid_token")


def test_verify_jwt_missing_secret():
    """Test verify_jwt raises error when secret is missing."""
    with patch("src.core.security.settings") as mock_settings:
        mock_settings.SUPABASE_JWT_SECRET = None

        with pytest.raises(ValueError, match="SUPABASE_JWT_SECRET not configured"):
            verify_jwt("some_token")

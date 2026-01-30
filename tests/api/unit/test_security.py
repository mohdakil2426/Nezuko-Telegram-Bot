"""Unit tests for Supabase security."""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from jwt import PyJWTError

# Add the apps/api directory to sys.path to resolve 'src' imports
api_dir = Path(__file__).resolve().parents[2]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

# Import after path setup
from src.core.security import verify_jwt  # noqa: E402


def test_verify_jwt_valid():
    """Test verify_jwt with valid token."""
    mock_payload = {
        "sub": "test_uid",
        "email": "test@example.com",
        "role": "authenticated",
        "user_metadata": {"full_name": "Test User"},
    }

    # Mock settings to ensure secret is present and mock auth is off
    with patch("src.core.security.settings") as mock_settings:
        mock_settings.SUPABASE_JWT_SECRET = "test_secret"
        mock_settings.MOCK_AUTH = False

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
        mock_settings.MOCK_AUTH = False

        with patch("jwt.decode", side_effect=PyJWTError("Invalid signature")):  # noqa: SIM117
            with pytest.raises(ValueError, match="Invalid token"):
                verify_jwt("invalid_token")


def test_verify_jwt_missing_secret():
    """Test verify_jwt raises error when secret is missing."""
    with patch("src.core.security.settings") as mock_settings:
        mock_settings.SUPABASE_JWT_SECRET = None
        mock_settings.MOCK_AUTH = False

        with pytest.raises(ValueError, match="SUPABASE_JWT_SECRET not configured"):
            verify_jwt("some_token")

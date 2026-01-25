"""Unit tests for Firebase security."""

from unittest.mock import patch

import pytest
from src.core.security import verify_firebase_token

# def test_verify_firebase_token_valid():
#     """Test verify_firebase_token with valid token."""
#     mock_decoded_token = {"uid": "test_uid", "email": "test@example.com"}
#
#     with patch("firebase_admin.auth.verify_id_token", return_value=mock_decoded_token):
#         user = verify_firebase_token("valid_token")
#         assert user["email"] == "test@example.com"
#         assert user["uid"] == "test_uid"


def test_verify_firebase_token_invalid():
    """Test verify_firebase_token with invalid token."""
    # Mock specific Firebase exception
    with patch("firebase_admin.auth.verify_id_token", side_effect=ValueError("Invalid token")):
        try:
            verify_firebase_token("invalid_token")
            pytest.fail("Should have raised ValueError")
        except ValueError:
            assert True

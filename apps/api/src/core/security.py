"""Security utilities for Firebase Auth."""

from typing import Any

from firebase_admin import auth

from src.core.firebase import get_firebase_app


def verify_firebase_token(token: str) -> dict[str, Any]:
    """
    Verify a Firebase ID token.
    Delegates validation to Firebase Admin SDK.
    Returns the decoded token dict (contains 'uid', 'email', etc).
    """
    try:
        get_firebase_app()  # Ensure app is initialized
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}") from e

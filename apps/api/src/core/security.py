"""Security utilities for Firebase Auth."""

from typing import Any

from firebase_admin import auth

from src.core.firebase import get_firebase_app


async def verify_firebase_token(token: str) -> dict[str, Any]:
    """
    Verify a Firebase ID token.
    Delegates validation to Firebase Admin SDK.
    Returns the decoded token dict (contains 'uid', 'email', etc).
    """
    import asyncio

    try:
        get_firebase_app()  # Ensure app is initialized
        try:
            return auth.verify_id_token(token)
        except Exception as e:
            if "Token used too early" in str(e):
                # Handle clock skew
                await asyncio.sleep(60)  # Wait a bit and try again
                return auth.verify_id_token(token)
            raise
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}") from e

"""Security utilities for Supabase Auth."""

from typing import Any

import jwt

from src.core.config import get_settings

settings = get_settings()


def verify_jwt(token: str) -> dict[str, Any]:
    """
    Verify a Supabase JWT token.
    Uses the SUPABASE_JWT_SECRET to validate the signature.
    """
    if settings.MOCK_AUTH:
        return {
            "uid": "f0689869-bdcc-4c67-aef5-36c6ffd528d7",
            "email": "admin@nezuko.bot",
            "name": "Admin User",
            "role": "authenticated",
        }

    if not settings.SUPABASE_JWT_SECRET:
        raise ValueError("SUPABASE_JWT_SECRET not configured")

    try:
        # Decode and verify the JWT
        # Supabase uses HS256 by default for its JWTs signed with the project secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            # check_audience=True, # Optional: enforce audience check if needed
            options={
                "verify_aud": False
            },  # Supabase often uses 'authenticated' but it's safe to check only signature for now or match specific audience
        )

        # Normalize fields to match what our app expects
        # Supabase returns 'sub' as the user ID, 'email' as email, etc.
        return {
            "uid": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("user_metadata", {}).get("full_name") or payload.get("email"),
            "role": payload.get("role"),
        }
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid token: {str(e)}") from e

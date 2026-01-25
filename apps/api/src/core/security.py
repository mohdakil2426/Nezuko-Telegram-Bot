"""Security utilities for Supabase Auth."""

from typing import Any

from supabase import Client

from src.core.supabase import get_supabase_client


def verify_supabase_token(token: str) -> Any:
    """
    Verify a Supabase JWT token.
    Delegates validation to Supabase GoTrue client.
    """
    client: Client = get_supabase_client()
    # auth.get_user(token) verifies the token signature and expiration
    response = client.auth.get_user(token)
    if not response or not response.user:
        raise ValueError("Invalid token")

    return response.user

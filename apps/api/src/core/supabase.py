"""Supabase client initialization."""

from supabase import Client, create_client

from src.core.config import get_settings

settings = get_settings()


def get_supabase_client() -> Client:
    """Create and return a Supabase client."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

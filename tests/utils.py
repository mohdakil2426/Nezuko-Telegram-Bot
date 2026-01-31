"""
Shared test utilities for Nezuko.

Re-exports utilities from api/utils.py for backwards compatibility.
"""

from tests.api.utils import create_mock_context, create_mock_update

__all__ = ["create_mock_context", "create_mock_update"]

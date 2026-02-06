"""Session-based authentication dependencies.

Authentication has been removed - all endpoints are now open for development.
In production, add proper authentication as needed.
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.session import Session


async def get_current_session(
    db: AsyncSession = Depends(get_session),
) -> Session:
    """Return a mock session for development.

    Authentication has been removed. This returns a mock session
    to maintain API compatibility with existing endpoints.

    Args:
        db: Database session (unused but kept for compatibility).

    Returns:
        Mock Session object for development.
    """
    # Return a mock session for all requests (no auth required)
    return Session(
        id="dev-session-id",
        telegram_id=123456789,
        telegram_username="developer",
        telegram_name="Developer",
        telegram_photo_url=None,
        expires_at=datetime.now(UTC).replace(year=2099),
        created_at=datetime.now(UTC),
    )


async def require_owner(
    session: Session = Depends(get_current_session),
) -> Session:
    """Return the current session (no owner check in dev mode).

    Args:
        session: Current session from get_current_session.

    Returns:
        Session object.
    """
    return session


# Type alias for dependency injection
CurrentSession = Annotated[Session, Depends(get_current_session)]
OwnerSession = Annotated[Session, Depends(require_owner)]

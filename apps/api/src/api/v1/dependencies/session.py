"""Session-based authentication dependencies.

These dependencies validate session cookies for protected routes,
using Telegram Login Widget for authentication.
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.models.session import Session
from src.services.telegram_auth_service import TelegramAuthService


async def get_current_session(
    session_id: Annotated[str | None, Cookie(alias="nezuko_session")] = None,
    db: AsyncSession = Depends(get_session),
) -> Session:
    """Validate session cookie and return the current session.

    This dependency extracts the session ID from the HTTP-only cookie,
    validates it against the database, and returns the session.

    Args:
        session_id: Session ID from cookie (auto-extracted by FastAPI).
        db: Database session.

    Returns:
        Valid Session object.

    Raises:
        HTTPException: 401 if no session cookie, session not found, or expired.
    """
    settings = get_settings()

    # Mock authentication for development
    if settings.MOCK_AUTH:
        # Return a mock session
        return Session(
            id="mock-session-id",
            telegram_id=settings.BOT_OWNER_TELEGRAM_ID or 123456789,
            telegram_username="owner",
            telegram_name="Mock Owner",
            telegram_photo_url=None,
            expires_at=datetime.now(UTC).replace(year=2099),
            created_at=datetime.now(UTC),
        )

    # Check for session cookie
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Cookie"},
        )

    # Validate session
    auth_service = TelegramAuthService(db)
    session = await auth_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
            headers={"WWW-Authenticate": "Cookie"},
        )

    return session


async def require_owner(
    session: Session = Depends(get_current_session),
) -> Session:
    """Require that the current session belongs to the configured owner.

    This is a stricter check that ensures the session's Telegram ID
    matches BOT_OWNER_TELEGRAM_ID. Useful for sensitive operations.

    Args:
        session: Current session from get_current_session.

    Returns:
        Session if owner, raises otherwise.

    Raises:
        HTTPException: 403 if not the owner.
    """
    settings = get_settings()

    # Mock auth skips owner check
    if settings.MOCK_AUTH:
        return session

    if settings.BOT_OWNER_TELEGRAM_ID and session.telegram_id != settings.BOT_OWNER_TELEGRAM_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to project owner only",
        )

    return session


# Type alias for dependency injection
CurrentSession = Annotated[Session, Depends(get_current_session)]
OwnerSession = Annotated[Session, Depends(require_owner)]

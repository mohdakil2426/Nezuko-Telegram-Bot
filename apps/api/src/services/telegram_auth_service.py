"""Telegram authentication service.

Handles verification of Telegram Login Widget data, session management,
and owner validation.
"""

import hashlib
import hmac
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.session import Session
from src.schemas.telegram_auth import SessionUser, TelegramAuthRequest


class TelegramAuthError(Exception):
    """Base exception for Telegram auth errors."""


class InvalidHashError(TelegramAuthError):
    """Raised when the HMAC hash verification fails."""


class ExpiredAuthError(TelegramAuthError):
    """Raised when the auth_date is too old."""


class NotOwnerError(TelegramAuthError):
    """Raised when the user is not the configured owner."""


class TelegramAuthService:
    """Service for Telegram authentication operations.

    Handles:
    - HMAC-SHA256 hash verification
    - Auth timestamp freshness check
    - Owner ID validation
    - Session CRUD operations
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize with database session.

        Args:
            session: SQLAlchemy async session.
        """
        self.session = session
        self.settings = get_settings()

    def verify_telegram_hash(self, auth_data: TelegramAuthRequest) -> bool:
        """Verify the HMAC-SHA256 hash from Telegram Login Widget.

        The verification algorithm:
        1. Create data_check_string by sorting all fields (except hash) alphabetically
        2. Compute SHA256 hash of the bot token
        3. Compute HMAC-SHA256 of data_check_string using the token hash
        4. Compare with received hash (timing-safe)

        Args:
            auth_data: Authentication data from Telegram widget.

        Returns:
            True if hash is valid.

        Raises:
            InvalidHashError: If hash verification fails.
            TelegramAuthError: If LOGIN_BOT_TOKEN is not configured.
        """
        if not self.settings.LOGIN_BOT_TOKEN:
            raise TelegramAuthError("LOGIN_BOT_TOKEN is not configured")

        # Build data_check_string from all fields except hash
        data_dict: dict[str, Any] = {
            "auth_date": auth_data.auth_date,
            "first_name": auth_data.first_name,
            "id": auth_data.id,
        }

        # Add optional fields only if present
        if auth_data.last_name:
            data_dict["last_name"] = auth_data.last_name
        if auth_data.username:
            data_dict["username"] = auth_data.username
        if auth_data.photo_url:
            data_dict["photo_url"] = auth_data.photo_url

        # Sort alphabetically and join with newlines
        data_check_string = "\n".join(f"{key}={data_dict[key]}" for key in sorted(data_dict.keys()))

        # Compute secret key as SHA256(bot_token)
        secret_key = hashlib.sha256(self.settings.LOGIN_BOT_TOKEN.encode()).digest()

        # Compute HMAC-SHA256
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        # Timing-safe comparison
        if not hmac.compare_digest(computed_hash, auth_data.hash):
            raise InvalidHashError("Hash verification failed")

        return True

    def is_auth_fresh(self, auth_date: int, max_age_seconds: int = 300) -> bool:
        """Check if authentication timestamp is recent enough.

        Prevents replay attacks by rejecting old auth data.

        Args:
            auth_date: Unix timestamp from Telegram widget.
            max_age_seconds: Maximum age in seconds (default: 5 minutes).

        Returns:
            True if auth is fresh.

        Raises:
            ExpiredAuthError: If auth_date is too old.
        """
        current_time = int(time.time())
        age = current_time - auth_date

        if age > max_age_seconds:
            raise ExpiredAuthError(f"Authentication expired ({age}s old, max {max_age_seconds}s)")

        return True

    def is_owner(self, telegram_id: int) -> bool:
        """Check if the Telegram ID matches the configured owner.

        Args:
            telegram_id: User's Telegram ID to check.

        Returns:
            True if user is the owner.

        Raises:
            NotOwnerError: If user is not the owner.
            TelegramAuthError: If BOT_OWNER_TELEGRAM_ID is not configured.
        """
        if not self.settings.BOT_OWNER_TELEGRAM_ID:
            raise TelegramAuthError("BOT_OWNER_TELEGRAM_ID is not configured")

        if telegram_id != self.settings.BOT_OWNER_TELEGRAM_ID:
            raise NotOwnerError("Access restricted to project owner only")

        return True

    async def create_session(self, auth_data: TelegramAuthRequest) -> Session:
        """Create a new session for the authenticated owner.

        Args:
            auth_data: Verified authentication data.

        Returns:
            Created Session object.
        """
        # Build full name
        full_name = auth_data.first_name
        if auth_data.last_name:
            full_name = f"{auth_data.first_name} {auth_data.last_name}"

        # Calculate expiry
        expiry = datetime.now(UTC) + timedelta(hours=self.settings.SESSION_EXPIRY_HOURS)

        session = Session(
            telegram_id=auth_data.id,
            telegram_username=auth_data.username,
            telegram_name=full_name,
            telegram_photo_url=auth_data.photo_url,
            expires_at=expiry,
        )

        self.session.add(session)
        await self.session.commit()
        await self.session.refresh(session)

        return session

    async def get_session(self, session_id: str) -> Session | None:
        """Retrieve a session by ID.

        Args:
            session_id: The session ID to look up.

        Returns:
            Session if found and not expired, None otherwise.
        """
        stmt = select(Session).where(Session.id == session_id)
        result = await self.session.execute(stmt)
        session = result.scalar_one_or_none()

        if session and session.is_expired():
            # Clean up expired session
            await self.delete_session(session_id)
            return None

        return session

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session by ID.

        Args:
            session_id: The session ID to delete.

        Returns:
            True if session was deleted, False if not found.
        """
        stmt = delete(Session).where(Session.id == session_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        # SQLAlchemy CursorResult has rowcount but type checker needs help
        row_count: int = getattr(result, "rowcount", 0)
        return row_count > 0

    async def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions from the database.

        Returns:
            Number of sessions deleted.
        """
        stmt = delete(Session).where(Session.expires_at < datetime.now(UTC))
        result = await self.session.execute(stmt)
        await self.session.commit()
        # SQLAlchemy CursorResult has rowcount but type checker needs help
        return int(getattr(result, "rowcount", 0))

    def session_to_user(self, session: Session) -> SessionUser:
        """Convert a Session to SessionUser schema.

        Args:
            session: Session model instance.

        Returns:
            SessionUser schema for API response.
        """
        # Parse name back to first/last
        name_parts = session.telegram_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None

        return SessionUser(
            telegram_id=session.telegram_id,
            username=session.telegram_username,
            first_name=first_name,
            last_name=last_name,
            photo_url=session.telegram_photo_url,
        )

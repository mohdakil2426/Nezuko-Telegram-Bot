"""Session model for Telegram authentication.

Stores authenticated sessions for the owner-only dashboard access.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import BigInteger, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.config import get_settings
from src.models.base import Base


def generate_session_id() -> str:
    """Generate a new session ID."""
    return str(uuid.uuid4())


def calculate_expiry() -> datetime:
    """Calculate session expiry time based on settings."""
    settings = get_settings()
    return datetime.now(UTC) + timedelta(hours=settings.SESSION_EXPIRY_HOURS)


class Session(Base):
    """Database model for user sessions.

    Attributes:
        id: UUID session identifier (stored in HTTP-only cookie).
        telegram_id: User's Telegram ID (owner verification).
        telegram_username: Telegram username (optional, for display).
        telegram_name: Full name from Telegram.
        telegram_photo_url: Profile photo URL (optional).
        expires_at: Session expiration timestamp.
        created_at: Session creation timestamp.
    """

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_session_id,
    )
    telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    telegram_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    telegram_name: Mapped[str] = mapped_column(String(255), nullable=False)
    telegram_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=calculate_expiry,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_sessions_telegram_id", "telegram_id"),
        Index("idx_sessions_expires_at", "expires_at"),
    )

    def is_expired(self) -> bool:
        """Check if the session has expired."""
        return datetime.now(UTC) > self.expires_at.replace(tzinfo=UTC)

    def __repr__(self) -> str:
        """Return string representation."""
        return (
            f"<Session(id={self.id[:8]}..., "
            f"telegram_id={self.telegram_id}, "
            f"expires_at={self.expires_at})>"
        )

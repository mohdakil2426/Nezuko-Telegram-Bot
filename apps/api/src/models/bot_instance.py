"""Bot Instance model for multi-bot management.

Stores multiple Telegram bots that the owner can manage from the dashboard.
Bot tokens are encrypted at rest using Fernet.
"""

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base
from src.models.mixins import SoftDeleteMixin

if TYPE_CHECKING:
    pass


class BotInstance(Base, SoftDeleteMixin):
    """Database model for managed bot instances.

    Attributes:
        id: Auto-incrementing primary key.
        owner_telegram_id: Telegram ID of the bot owner.
        bot_id: Telegram bot user ID.
        bot_username: Bot's @username.
        bot_name: Bot's display name.
        token_encrypted: Fernet-encrypted bot token.
        is_active: Whether the bot is currently active.
        created_at: When the bot was added.
        updated_at: Last modification timestamp.
    """

    __tablename__ = "bot_instances"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    owner_telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        index=True,
    )
    bot_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        unique=True,
    )
    bot_username: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    bot_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    token_encrypted: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_bot_instances_owner", "owner_telegram_id"),
        Index("idx_bot_instances_bot_id", "bot_id"),
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return (
            f"<BotInstance(id={self.id}, "
            f"bot_username=@{self.bot_username}, "
            f"is_active={self.is_active})>"
        )

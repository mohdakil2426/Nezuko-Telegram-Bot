# pylint: disable=too-few-public-methods
"""
SQLAlchemy ORM models for Nezuko database schema.
"""

from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apps.bot.core.database import Base


class Owner(Base):
    """Bot owner (admin who configures protected groups)."""

    __tablename__ = "owners"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    protected_groups: Mapped[list["ProtectedGroup"]] = relationship(
        "ProtectedGroup", back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Owner user_id={self.user_id} username={self.username}>"


class ProtectedGroup(Base):
    """Group protected by channel verification."""

    __tablename__ = "protected_groups"

    group_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("owners.user_id", ondelete="CASCADE")
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    params: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    # Analytics columns for member sync
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    owner: Mapped["Owner"] = relationship("Owner", back_populates="protected_groups")
    channel_links: Mapped[list["GroupChannelLink"]] = relationship(
        "GroupChannelLink", back_populates="group", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("idx_groups_owner", "owner_id"),
        Index("idx_groups_enabled", "enabled"),
    )

    def __repr__(self) -> str:
        return f"<ProtectedGroup id={self.group_id} enabled={self.enabled}>"


class EnforcedChannel(Base):
    """Channel that users must join."""

    __tablename__ = "enforced_channels"

    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invite_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Analytics columns for subscriber sync
    subscriber_count: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    group_links: Mapped[list["GroupChannelLink"]] = relationship(
        "GroupChannelLink", back_populates="channel", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EnforcedChannel channel_id={self.channel_id} title={self.title}>"


class GroupChannelLink(Base):
    """Many-to-many relationship between groups and channels."""

    __tablename__ = "group_channel_links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)  # Use default Integer
    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("protected_groups.group_id", ondelete="CASCADE")
    )
    channel_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("enforced_channels.channel_id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    # Relationships
    group: Mapped["ProtectedGroup"] = relationship("ProtectedGroup", back_populates="channel_links")
    channel: Mapped["EnforcedChannel"] = relationship(
        "EnforcedChannel", back_populates="group_links"
    )

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("group_id", "channel_id", name="uq_group_channel"),
        Index("idx_links_group", "group_id"),
        Index("idx_links_channel", "channel_id"),
    )

    def __repr__(self) -> str:
        return f"<GroupChannelLink group_id={self.group_id} channel_id={self.channel_id}>"


class ApiCallLog(Base):
    """Log of all Telegram API calls for analytics.

    Tracks API call performance, success rates, and error types
    to power the dashboard analytics charts.
    """

    __tablename__ = "api_call_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    method: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )

    # Composite index for time-based analytics queries
    __table_args__ = (Index("idx_api_call_log_method_timestamp", "method", "timestamp"),)

    def __repr__(self) -> str:
        return f"<ApiCallLog id={self.id} method={self.method} success={self.success}>"

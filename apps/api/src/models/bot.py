from datetime import UTC, datetime

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Owner(Base):
    """Bot owner (admin who configures protected groups)."""

    __tablename__ = "owners"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    protected_groups: Mapped[list["ProtectedGroup"]] = relationship(
        "ProtectedGroup",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Owner user_id={self.user_id} username={self.username}>"


class ProtectedGroup(Base):
    """Group protected by channel verification."""

    __tablename__ = "protected_groups"

    group_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("owners.user_id", ondelete="CASCADE"),
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    params: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    owner: Mapped["Owner"] = relationship("Owner", back_populates="protected_groups")
    channel_links: Mapped[list["GroupChannelLink"]] = relationship(
        "GroupChannelLink",
        back_populates="group",
        cascade="all, delete-orphan",
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    group_links: Mapped[list["GroupChannelLink"]] = relationship(
        "GroupChannelLink",
        back_populates="channel",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EnforcedChannel channel_id={self.channel_id} title={self.title}>"


class GroupChannelLink(Base):
    """Many-to-many relationship between groups and channels."""

    __tablename__ = "group_channel_links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("protected_groups.group_id", ondelete="CASCADE"),
    )
    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("enforced_channels.channel_id", ondelete="CASCADE"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
    )

    # Relationships
    group: Mapped["ProtectedGroup"] = relationship("ProtectedGroup", back_populates="channel_links")
    channel: Mapped["EnforcedChannel"] = relationship(
        "EnforcedChannel",
        back_populates="group_links",
    )

    def __repr__(self) -> str:
        return f"<GroupChannelLink group_id={self.group_id} channel_id={self.channel_id}>"

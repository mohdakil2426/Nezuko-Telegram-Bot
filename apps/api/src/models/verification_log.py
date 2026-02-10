"""Database model for verification logging.

This model tracks all verification events for analytics and real-time monitoring.
"""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class VerificationLog(Base):
    """Log of all verification events for analytics.

    Tracks when users are verified, restricted, or encounter errors.
    Used for:
    - Real-time analytics dashboard
    - Verification trend charts
    - Performance monitoring (latency tracking)
    """

    __tablename__ = "verification_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    group_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    bot_instance_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("bot_instances.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )  # 'verified', 'restricted', 'error'
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cached: Mapped[bool] = mapped_column(Boolean, default=False)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        index=True,
    )

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("idx_verification_log_timestamp_status", "timestamp", "status"),
        Index("idx_verification_log_group_timestamp", "group_id", "timestamp"),
        Index("idx_verification_log_bot_timestamp", "bot_instance_id", "timestamp"),
        Index("idx_verification_log_bot_status", "bot_instance_id", "status", "timestamp"),
    )

    def __repr__(self) -> str:
        return (
            f"<VerificationLog id={self.id} user={self.user_id} "
            f"group={self.group_id} status={self.status}>"
        )

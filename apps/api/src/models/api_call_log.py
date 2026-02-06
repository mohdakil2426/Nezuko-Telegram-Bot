"""Database model for API call logging.

This model tracks all Telegram API calls for analytics and performance monitoring.
"""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ApiCallLog(Base):
    """Log of all Telegram API calls for analytics.

    Tracks API call performance, success rates, and error types
    to power the dashboard analytics charts.

    Used for:
    - API call distribution charts
    - Latency monitoring
    - Error rate tracking
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
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        index=True,
    )

    # Composite index for time-based analytics queries
    __table_args__ = (Index("idx_api_call_log_method_timestamp", "method", "timestamp"),)

    def __repr__(self) -> str:
        return f"<ApiCallLog id={self.id} method={self.method} success={self.success}>"

"""
Verification Logger for Analytics.

Logs all verification events to the database for analytics and real-time monitoring.
Uses async insert to avoid blocking the verification flow.
"""

import asyncio
import contextlib
import logging
import time
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, String
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Mapped, mapped_column

from apps.bot.core.database import Base, get_session

logger = logging.getLogger(__name__)


class VerificationLog(Base):
    """Log of all verification events for analytics.

    This model mirrors the one in apps/api/src/models/verification_log.py
    to ensure the bot can write to the same table the admin API reads from.
    """

    __tablename__ = "verification_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    group_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )  # 'verified', 'restricted', 'error'
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cached: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        index=True,
    )

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("idx_verification_log_timestamp_status", "timestamp", "status"),
        Index("idx_verification_log_group_timestamp", "group_id", "timestamp"),
        {"extend_existing": True},  # Allow redefinition if table exists
    )

    def __repr__(self) -> str:
        return (
            f"<VerificationLog id={self.id} user={self.user_id} "
            f"group={self.group_id} status={self.status}>"
        )


async def log_verification(
    user_id: int,
    group_id: int,
    channel_id: int,
    status: str,
    latency_ms: int | None = None,
    cached: bool = False,
) -> None:
    """
    Log a verification event to the database.

    This is designed to be called via asyncio.create_task() to avoid
    blocking the verification flow. Errors are caught and logged but
    do not propagate to the caller.

    Args:
        user_id: Telegram user ID
        group_id: Telegram group ID
        channel_id: Telegram channel ID
        status: Verification status ('verified', 'restricted', 'error')
        latency_ms: Time taken for verification in milliseconds
        cached: Whether the result came from cache
    """
    try:
        async with get_session() as session:
            log_entry = VerificationLog(
                user_id=user_id,
                group_id=group_id,
                channel_id=channel_id,
                status=status,
                latency_ms=latency_ms,
                cached=cached,
                timestamp=datetime.now(UTC),
            )
            session.add(log_entry)
            # Commit happens automatically via context manager

        logger.debug(
            "Logged verification: user=%s group=%s channel=%s status=%s",
            user_id,
            group_id,
            channel_id,
            status,
        )
    except (SQLAlchemyError, OSError) as e:
        # Log error but don't propagate - verification should succeed even if logging fails
        logger.error("Failed to log verification: %s", e)


async def log_verification_async(
    user_id: int,
    group_id: int,
    channel_id: int,
    status: str,
    latency_ms: int | None = None,
    cached: bool = False,
) -> asyncio.Task[None]:
    """
    Fire-and-forget version that creates a background task.

    Returns the task for optional monitoring/testing.
    """
    task = asyncio.create_task(
        log_verification(user_id, group_id, channel_id, status, latency_ms, cached)
    )
    return task


class VerificationLogBuffer:
    """
    Buffer for batch logging high-volume verification events.

    Collects events and flushes them in batches to reduce database load.
    Useful when verification volume exceeds ~100/second.
    """

    def __init__(self, batch_size: int = 50, flush_interval_seconds: float = 5.0):
        self.batch_size = batch_size
        self.flush_interval = flush_interval_seconds
        self._buffer: list[dict] = []
        self._lock = asyncio.Lock()
        self._last_flush = time.time()
        self._flush_task: asyncio.Task | None = None

    async def add(
        self,
        user_id: int,
        group_id: int,
        channel_id: int,
        status: str,
        latency_ms: int | None = None,
        cached: bool = False,
    ) -> None:
        """Add a verification event to the buffer."""
        async with self._lock:
            self._buffer.append(
                {
                    "user_id": user_id,
                    "group_id": group_id,
                    "channel_id": channel_id,
                    "status": status,
                    "latency_ms": latency_ms,
                    "cached": cached,
                    "timestamp": datetime.now(UTC),
                }
            )

            # Flush if buffer is full
            if len(self._buffer) >= self.batch_size:
                await self._flush()

    async def _flush(self) -> None:
        """Flush the buffer to the database."""
        if not self._buffer:
            return

        entries_to_flush = self._buffer.copy()
        self._buffer.clear()
        self._last_flush = time.time()

        try:
            async with get_session() as session:
                for entry in entries_to_flush:
                    session.add(VerificationLog(**entry))
                # Commit happens automatically via context manager

            logger.info("Flushed %d verification logs to database", len(entries_to_flush))
        except (SQLAlchemyError, OSError) as e:
            logger.error("Failed to flush verification logs: %s", e)
            # Re-add to buffer for retry on next flush
            async with self._lock:
                self._buffer.extend(entries_to_flush)

    async def start_periodic_flush(self) -> None:
        """Start background task for periodic flushing."""
        if self._flush_task is not None:
            return

        async def _periodic_flush():
            while True:
                await asyncio.sleep(self.flush_interval)
                async with self._lock:
                    if self._buffer and (time.time() - self._last_flush) >= self.flush_interval:
                        await self._flush()

        self._flush_task = asyncio.create_task(_periodic_flush())

    async def stop(self) -> None:
        """Stop periodic flushing and flush remaining entries."""
        if self._flush_task:
            self._flush_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._flush_task
            self._flush_task = None

        # Final flush
        await self._flush()


# Global buffer instance for high-volume scenarios
verification_buffer = VerificationLogBuffer()

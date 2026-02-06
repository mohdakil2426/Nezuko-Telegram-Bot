"""Event system for real-time updates via Server-Sent Events (SSE).

Provides an in-memory event bus for publishing and subscribing to events.
Events are streamed to connected dashboard clients for live updates.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

logger = structlog.get_logger(__name__)


class EventType(StrEnum):
    """Types of events that can be published."""

    # Activity events
    ACTIVITY = "activity"
    VERIFICATION = "verification"
    MEMBER_JOIN = "member_join"
    MEMBER_LEAVE = "member_leave"

    # Analytics events
    ANALYTICS = "analytics"
    STATS_UPDATE = "stats_update"

    # Log events
    LOG = "log"
    ERROR = "error"
    WARNING = "warning"

    # Bot events
    BOT_STATUS = "bot_status"
    BOT_ADDED = "bot_added"
    BOT_REMOVED = "bot_removed"

    # System events
    HEARTBEAT = "heartbeat"
    CONNECTED = "connected"


@dataclass
class Event:
    """Represents a single event."""

    type: EventType
    data: dict
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_sse(self) -> str:
        """Convert event to SSE format."""
        payload = {
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
        }
        return f"data: {json.dumps(payload)}\n\n"


class EventBus:
    """Singleton event bus for managing event subscribers.

    Usage:
        # Get the singleton instance
        bus = EventBus.get_instance()

        # Publish an event
        await bus.publish(EventType.ACTIVITY, {"action": "user_verified"})

        # Subscribe to events
        async for event in bus.subscribe():
            print(event)
    """

    _instance: EventBus | None = None
    _lock = asyncio.Lock()

    def __init__(self) -> None:
        """Initialize the event bus. Use get_instance() instead."""
        self._subscribers: set[asyncio.Queue[Event]] = set()
        self._lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls) -> EventBus:
        """Get or create the singleton instance."""
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    async def subscribe(self) -> AsyncIterator[Event]:
        """Subscribe to events and yield them as they occur.

        Yields:
            Event objects as they are published.
        """
        queue: asyncio.Queue[Event] = asyncio.Queue()

        async with self._lock:
            self._subscribers.add(queue)
            logger.debug(
                "event_subscriber_added",
                subscriber_count=len(self._subscribers),
            )

        try:
            # Send connected event
            yield Event(
                type=EventType.CONNECTED,
                data={"message": "Connected to event stream"},
            )

            while True:
                event = await queue.get()
                yield event
        finally:
            async with self._lock:
                self._subscribers.discard(queue)
                logger.debug(
                    "event_subscriber_removed",
                    subscriber_count=len(self._subscribers),
                )

    async def publish(self, event_type: EventType, data: dict) -> None:
        """Publish an event to all subscribers.

        Args:
            event_type: Type of event to publish.
            data: Event payload data.
        """
        event = Event(type=event_type, data=data)

        async with self._lock:
            for queue in self._subscribers:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    logger.warning(
                        "event_queue_full",
                        event_type=event_type.value,
                    )

        logger.debug(
            "event_published",
            event_type=event_type.value,
            subscriber_count=len(self._subscribers),
        )

    @property
    def subscriber_count(self) -> int:
        """Get the number of active subscribers."""
        return len(self._subscribers)


async def publish_event(event_type: EventType, data: dict) -> None:
    """Convenience function to publish an event.

    Args:
        event_type: Type of event to publish.
        data: Event payload data.
    """
    bus = await EventBus.get_instance()
    await bus.publish(event_type, data)


# Convenience publish functions for common events
async def publish_activity(action: str, details: dict | None = None) -> None:
    """Publish an activity event."""
    await publish_event(
        EventType.ACTIVITY,
        {"action": action, **(details or {})},
    )


async def publish_verification(
    user_id: int,
    username: str | None,
    group_id: int,
    success: bool,
) -> None:
    """Publish a verification event."""
    await publish_event(
        EventType.VERIFICATION,
        {
            "user_id": user_id,
            "username": username,
            "group_id": group_id,
            "success": success,
        },
    )


async def publish_stats_update(stats: dict) -> None:
    """Publish a stats update event."""
    await publish_event(EventType.STATS_UPDATE, stats)


async def publish_log(level: str, message: str, **extra: str) -> None:
    """Publish a log event."""
    await publish_event(
        EventType.LOG,
        {"level": level, "message": message, **extra},
    )


async def publish_member_join(
    user_id: int,
    username: str | None,
    group_id: int,
    group_name: str | None = None,
) -> None:
    """Publish a member join event."""
    await publish_event(
        EventType.MEMBER_JOIN,
        {
            "user_id": user_id,
            "username": username,
            "group_id": group_id,
            "group_name": group_name,
        },
    )


async def publish_member_leave(
    user_id: int,
    username: str | None,
    group_id: int,
    reason: str | None = None,
) -> None:
    """Publish a member leave event."""
    await publish_event(
        EventType.MEMBER_LEAVE,
        {
            "user_id": user_id,
            "username": username,
            "group_id": group_id,
            "reason": reason,
        },
    )


async def publish_bot_status(
    bot_id: int,
    bot_username: str,
    status: str,
    is_active: bool,
) -> None:
    """Publish a bot status change event."""
    await publish_event(
        EventType.BOT_STATUS,
        {
            "bot_id": bot_id,
            "bot_username": bot_username,
            "status": status,
            "is_active": is_active,
        },
    )


async def publish_bot_added(
    bot_id: int,
    bot_username: str,
    owner_id: int,
) -> None:
    """Publish a bot added event."""
    await publish_event(
        EventType.BOT_ADDED,
        {
            "bot_id": bot_id,
            "bot_username": bot_username,
            "owner_id": owner_id,
        },
    )


async def publish_bot_removed(
    bot_id: int,
    bot_username: str,
    owner_id: int,
) -> None:
    """Publish a bot removed event."""
    await publish_event(
        EventType.BOT_REMOVED,
        {
            "bot_id": bot_id,
            "bot_username": bot_username,
            "owner_id": owner_id,
        },
    )

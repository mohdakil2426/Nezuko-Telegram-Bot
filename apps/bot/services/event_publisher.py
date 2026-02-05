"""Event Publisher Service for publishing events to the API.

This service allows the bot to send real-time updates to the
dashboard via the API's SSE infrastructure.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

import httpx
import structlog

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)


class EventPublisher:
    """Publishes events to the API for real-time dashboard updates.

    Uses HTTP POST to the API's /events/publish endpoint,
    which then broadcasts to all SSE subscribers.
    """

    def __init__(
        self,
        api_base_url: str = "http://localhost:8080",
        *,
        enabled: bool = True,
        timeout: float = 5.0,
    ) -> None:
        """Initialize the event publisher.

        Args:
            api_base_url: Base URL of the API server
            enabled: Whether publishing is enabled
            timeout: HTTP request timeout in seconds
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.enabled = enabled
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None
        self._session_cookie: str | None = None
        # Track pending tasks to avoid garbage collection (RUF006)
        self._pending_tasks: set[asyncio.Task] = set()

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.api_base_url,
                timeout=self.timeout,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def set_session_cookie(self, cookie: str) -> None:
        """Set the session cookie for authenticated requests.

        Args:
            cookie: The session cookie value
        """
        self._session_cookie = cookie

    async def publish(
        self,
        event_type: str,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Publish an event to the API.

        Args:
            event_type: Type of event (verification, activity, etc.)
            data: Event payload data

        Returns:
            True if published successfully, False otherwise
        """
        if not self.enabled:
            return False

        if not self._session_cookie:
            logger.warning(
                "event_publish_no_session",
                event_type=event_type,
                message="No session cookie set, cannot publish",
            )
            return False

        try:
            client = await self._get_client()
            response = await client.post(
                "/api/v1/events/publish",
                json={
                    "event_type": event_type,
                    "data": data or {},
                },
                cookies={"session": self._session_cookie},
            )

            if response.status_code == 200:
                result = response.json()
                logger.debug(
                    "event_published",
                    event_type=event_type,
                    subscriber_count=result.get("subscriber_count", 0),
                )
                return True
            else:
                logger.warning(
                    "event_publish_failed",
                    event_type=event_type,
                    status_code=response.status_code,
                    response=response.text[:200],
                )
                return False

        except httpx.RequestError as exc:
            logger.error(
                "event_publish_error",
                event_type=event_type,
                error=str(exc),
            )
            return False

    def publish_background(
        self,
        event_type: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Publish an event in the background (fire-and-forget).

        This is useful when you don't need to wait for the result.

        Args:
            event_type: Type of event
            data: Event payload data
        """
        task = asyncio.create_task(self.publish(event_type, data))
        # Track task to prevent garbage collection (RUF006 pattern)
        self._pending_tasks.add(task)
        task.add_done_callback(self._pending_tasks.discard)

    # ==========================================================================
    # Convenience methods for common event types
    # ==========================================================================

    async def publish_verification(
        self,
        user_id: int,
        group_id: int,
        status: str,
        cached: bool = False,
        latency_ms: int | None = None,
    ) -> bool:
        """Publish a verification event.

        Args:
            user_id: Telegram user ID
            group_id: Telegram group ID
            status: Verification status (verified, restricted, error)
            cached: Whether the result was cached
            latency_ms: Verification latency in milliseconds
        """
        return await self.publish(
            "verification",
            {
                "user_id": user_id,
                "group_id": group_id,
                "status": status,
                "cached": cached,
                "latency_ms": latency_ms,
            },
        )

    async def publish_stats_update(self) -> bool:
        """Publish a stats update event to trigger dashboard refresh."""
        return await self.publish("stats_update", {"trigger": "bot"})

    async def publish_activity(
        self,
        action: str,
        details: dict[str, Any] | None = None,
    ) -> bool:
        """Publish a general activity event.

        Args:
            action: Description of the action
            details: Additional details
        """
        return await self.publish(
            "activity",
            {
                "action": action,
                **(details or {}),
            },
        )

    async def publish_member_join(
        self,
        user_id: int,
        group_id: int,
        username: str | None = None,
    ) -> bool:
        """Publish a member join event."""
        return await self.publish(
            "member_join",
            {
                "user_id": user_id,
                "group_id": group_id,
                "username": username,
            },
        )

    async def publish_member_leave(
        self,
        user_id: int,
        group_id: int,
        username: str | None = None,
    ) -> bool:
        """Publish a member leave event."""
        return await self.publish(
            "member_leave",
            {
                "user_id": user_id,
                "group_id": group_id,
                "username": username,
            },
        )

    async def publish_bot_status(
        self,
        status: str,
        uptime_seconds: int | None = None,
    ) -> bool:
        """Publish a bot status event.

        Args:
            status: Bot status (online, offline, starting, stopping)
            uptime_seconds: Current uptime in seconds
        """
        return await self.publish(
            "bot_status",
            {
                "status": status,
                "uptime_seconds": uptime_seconds,
            },
        )


class _EventPublisherHolder:
    """Singleton holder for EventPublisher (avoids global statement)."""

    instance: EventPublisher | None = None


def get_event_publisher() -> EventPublisher:
    """Get the global event publisher instance."""
    if _EventPublisherHolder.instance is None:
        _EventPublisherHolder.instance = EventPublisher(enabled=False)
    return _EventPublisherHolder.instance


def configure_event_publisher(
    api_base_url: str,
    *,
    enabled: bool = True,
) -> EventPublisher:
    """Configure and return the global event publisher.

    Args:
        api_base_url: Base URL of the API server
        enabled: Whether publishing is enabled

    Returns:
        The configured event publisher
    """
    _EventPublisherHolder.instance = EventPublisher(api_base_url, enabled=enabled)
    return _EventPublisherHolder.instance

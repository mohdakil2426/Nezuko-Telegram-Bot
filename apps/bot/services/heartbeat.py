"""Bot Heartbeat Service.

Sends periodic heartbeats to the API to track bot uptime.
Integrates with the API's uptime tracking infrastructure.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from collections.abc import Mapping  # noqa: F401

logger = logging.getLogger(__name__)


class HeartbeatService:
    """Sends periodic heartbeats to the API server.

    The API uses these heartbeats to track bot uptime and health.
    If no heartbeat is received for > 2 minutes, the bot is considered offline.
    """

    def __init__(
        self,
        api_base_url: str = "http://localhost:8080",
        interval_seconds: int = 30,
        *,
        session_cookie: str | None = None,
    ) -> None:
        """Initialize the heartbeat service.

        Args:
            api_base_url: Base URL of the API server
            interval_seconds: Seconds between heartbeats
            session_cookie: Authentication session cookie
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.interval = interval_seconds
        self.session_cookie = session_cookie
        self._task: asyncio.Task | None = None
        self._running = False
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.api_base_url,
                timeout=10.0,
            )
        return self._client

    def set_session_cookie(self, cookie: str) -> None:
        """Set the session cookie for authenticated requests.

        Args:
            cookie: The session cookie value
        """
        self.session_cookie = cookie

    async def start(self) -> bool:
        """Start the heartbeat service.

        Records bot start with the API and begins periodic heartbeats.

        Returns:
            True if started successfully
        """
        if self._running:
            logger.warning("Heartbeat service already running")
            return True

        # Record bot start
        if not await self._record_start():
            logger.error("Failed to record bot start, heartbeat service not started")
            return False

        # Start heartbeat loop
        self._running = True
        self._task = asyncio.create_task(self._heartbeat_loop())
        logger.info(
            "Heartbeat service started",
            extra={"interval": self.interval, "api_url": self.api_base_url},
        )
        return True

    async def stop(self) -> None:
        """Stop the heartbeat service.

        Records bot stop with the API.
        """
        self._running = False

        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

        # Record bot stop
        await self._record_stop()

        # Close client
        if self._client:
            await self._client.aclose()
            self._client = None

        logger.info("Heartbeat service stopped")

    async def _heartbeat_loop(self) -> None:
        """Send heartbeats at regular intervals."""
        consecutive_failures = 0
        max_failures = 5

        while self._running:
            try:
                await asyncio.sleep(self.interval)

                if not self._running:
                    break

                success = await self._send_heartbeat()

                if success:
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        logger.error(
                            "Heartbeat failed %d times consecutively",
                            consecutive_failures,
                        )

            except asyncio.CancelledError:
                break
            except (httpx.RequestError, OSError, RuntimeError, ValueError) as e:
                logger.error("Error in heartbeat loop: %s", e, exc_info=True)
                consecutive_failures += 1
                await asyncio.sleep(5)  # Brief pause before retry

    async def _send_heartbeat(self) -> bool:
        """Send a single heartbeat.

        Returns:
            True if successful
        """
        if not self.session_cookie:
            logger.debug("No session cookie, skipping heartbeat")
            return False

        try:
            client = await self._get_client()
            response = await client.post(
                "/api/v1/events/bot/heartbeat",
                cookies={"session": self.session_cookie},
            )

            if response.status_code == 200:
                result = response.json()
                logger.debug(
                    "Heartbeat sent",
                    extra={"uptime": result.get("uptime_seconds")},
                )
                return True

            logger.warning(
                "Heartbeat failed: %d %s",
                response.status_code,
                response.text[:100],
            )
            return False

        except httpx.RequestError as e:
            logger.warning("Heartbeat request failed: %s", e)
            return False

    async def _record_start(self) -> bool:
        """Record bot start with the API.

        Returns:
            True if successful
        """
        if not self.session_cookie:
            logger.warning("No session cookie, cannot record bot start")
            return False

        try:
            client = await self._get_client()
            response = await client.post(
                "/api/v1/events/bot/start",
                cookies={"session": self.session_cookie},
            )

            if response.status_code == 200:
                logger.info("Bot start recorded with API")
                return True

            logger.warning(
                "Failed to record bot start: %d",
                response.status_code,
            )
            return False

        except httpx.RequestError as e:
            logger.error("Failed to record bot start: %s", e)
            return False

    async def _record_stop(self) -> bool:
        """Record bot stop with the API.

        Returns:
            True if successful
        """
        if not self.session_cookie:
            return False

        try:
            client = await self._get_client()
            response = await client.post(
                "/api/v1/events/bot/stop",
                cookies={"session": self.session_cookie},
            )

            if response.status_code == 200:
                logger.info("Bot stop recorded with API")
                return True

            logger.warning(
                "Failed to record bot stop: %d",
                response.status_code,
            )
            return False

        except httpx.RequestError as e:
            logger.error("Failed to record bot stop: %s", e)
            return False


class _HeartbeatServiceHolder:
    """Singleton holder for HeartbeatService (avoids global statement)."""

    instance: HeartbeatService | None = None


def get_heartbeat_service() -> HeartbeatService:
    """Get the global heartbeat service instance."""
    if _HeartbeatServiceHolder.instance is None:
        _HeartbeatServiceHolder.instance = HeartbeatService()
    return _HeartbeatServiceHolder.instance


def configure_heartbeat_service(
    api_base_url: str,
    interval_seconds: int = 30,
    *,
    session_cookie: str | None = None,
) -> HeartbeatService:
    """Configure and return the global heartbeat service.

    Args:
        api_base_url: Base URL of the API server
        interval_seconds: Seconds between heartbeats
        session_cookie: Authentication session cookie

    Returns:
        The configured heartbeat service
    """
    _HeartbeatServiceHolder.instance = HeartbeatService(
        api_base_url=api_base_url,
        interval_seconds=interval_seconds,
        session_cookie=session_cookie,
    )
    return _HeartbeatServiceHolder.instance

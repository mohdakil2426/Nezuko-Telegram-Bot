"""WebSocket connection manager for real-time log streaming.

Provides authenticated WebSocket connections for live log streaming
to the admin panel.
"""

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class LogMessage:
    """Structured log message for WebSocket transmission."""

    def __init__(
        self,
        level: str,
        message: str,
        logger_name: str = "system",
        trace_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ):
        self.id = f"{datetime.now(UTC).timestamp()}-{id(self)}"
        self.timestamp = datetime.now(UTC).isoformat()
        self.level = level.upper()
        self.logger = logger_name
        self.message = message
        self.trace_id = trace_id
        self.extra = extra or {}

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "log",
            "data": {
                "id": self.id,
                "timestamp": self.timestamp,
                "level": self.level,
                "logger": self.logger,
                "message": self.message,
                "trace_id": self.trace_id,
                "extra": self.extra,
            },
        }


class ConnectionManager:
    """Manages WebSocket connections for log streaming.

    Features:
    - Multiple concurrent connections
    - Per-connection log level filtering
    - Heartbeat to keep connections alive
    - Broadcast to all connected clients
    """

    def __init__(self):
        self._connections: dict[WebSocket, dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._log_queue: asyncio.Queue[LogMessage] = asyncio.Queue(maxsize=1000)
        self._broadcast_task: asyncio.Task | None = None

    @property
    def connection_count(self) -> int:
        """Number of active connections."""
        return len(self._connections)

    async def connect(self, websocket: WebSocket, user_id: str | None = None) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._connections[websocket] = {
                "user_id": user_id,
                "connected_at": datetime.now(UTC).isoformat(),
                "filters": {"level": None, "logger": None},
            }
        logger.info("WebSocket connected: %s (total: %d)", user_id, len(self._connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self._connections:
                del self._connections[websocket]
        logger.info("WebSocket disconnected (remaining: %d)", len(self._connections))

    async def update_filters(
        self, websocket: WebSocket, level: str | None = None, logger_name: str | None = None
    ) -> None:
        """Update filters for a specific connection."""
        async with self._lock:
            if websocket in self._connections:
                self._connections[websocket]["filters"] = {
                    "level": level.upper() if level else None,
                    "logger": logger_name,
                }

    async def broadcast(self, message: LogMessage) -> None:
        """Broadcast a log message to all connected clients."""
        if not self._connections:
            return

        # Level priority for filtering
        level_priority = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3, "CRITICAL": 4}

        connections_to_remove = []
        async with self._lock:
            for websocket, info in self._connections.items():
                # Apply filters
                filters = info.get("filters", {})

                # Level filter
                if filters.get("level"):
                    msg_priority = level_priority.get(message.level, 1)
                    filter_priority = level_priority.get(filters["level"], 1)
                    if msg_priority < filter_priority:
                        continue

                # Logger filter
                if filters.get("logger") and message.logger != filters["logger"]:
                    continue

                try:
                    await websocket.send_json(message.to_dict())
                except (ConnectionError, OSError, RuntimeError) as e:
                    logger.warning("Failed to send to WebSocket: %s", e)
                    connections_to_remove.append(websocket)

        # Clean up failed connections
        for ws in connections_to_remove:
            await self.disconnect(ws)

    async def send_heartbeat(self) -> None:
        """Send heartbeat to all connections."""
        heartbeat = {
            "type": "heartbeat",
            "timestamp": datetime.now(UTC).isoformat(),
        }

        connections_to_remove = []
        async with self._lock:
            for websocket in self._connections:
                try:
                    await websocket.send_json(heartbeat)
                except (ConnectionError, OSError, RuntimeError):
                    connections_to_remove.append(websocket)

        for ws in connections_to_remove:
            await self.disconnect(ws)

    async def _broadcast_worker(self) -> None:
        """Background task that processes queued log messages."""
        while True:
            try:
                message = await asyncio.wait_for(self._log_queue.get(), timeout=30.0)
                await self.broadcast(message)
            except TimeoutError:
                # Send heartbeat if no logs for 30 seconds
                await self.send_heartbeat()
            except asyncio.CancelledError:
                break
            except (OSError, RuntimeError) as e:
                logger.error("Broadcast worker error: %s", e)

    def start_broadcast_worker(self) -> None:
        """Start the background broadcast worker."""
        if self._broadcast_task is None or self._broadcast_task.done():
            self._broadcast_task = asyncio.create_task(self._broadcast_worker())

    def stop_broadcast_worker(self) -> None:
        """Stop the background broadcast worker."""
        if self._broadcast_task:
            self._broadcast_task.cancel()

    async def queue_log(self, message: LogMessage) -> None:
        """Queue a log message for broadcast."""
        try:
            self._log_queue.put_nowait(message)
        except asyncio.QueueFull:
            # Drop oldest message if queue is full
            try:
                self._log_queue.get_nowait()
                self._log_queue.put_nowait(message)
            except asyncio.QueueEmpty:
                pass


# Global manager instance
connection_manager = ConnectionManager()


async def handle_websocket_logs(websocket: WebSocket, user_id: str | None = None) -> None:
    """
    Handle WebSocket connection for log streaming.

    Args:
        websocket: The WebSocket connection
        user_id: Authenticated user ID (from token validation)
    """
    await connection_manager.connect(websocket, user_id)

    try:
        while True:
            # Receive messages from client (for filter commands)
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("action") == "filter":
                    await connection_manager.update_filters(
                        websocket,
                        level=message.get("level"),
                        logger_name=message.get("logger"),
                    )
                    await websocket.send_json({"type": "filter_updated", "filters": message})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        pass
    finally:
        await connection_manager.disconnect(websocket)


def emit_log(
    level: str,
    message: str,
    logger_name: str = "system",
    trace_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """
    Emit a log message to all WebSocket clients.

    This is a synchronous function that queues the log for async broadcast.
    Safe to call from anywhere in the application.
    """
    log_msg = LogMessage(level, message, logger_name, trace_id, extra)

    try:
        asyncio.get_running_loop()
        asyncio.create_task(connection_manager.queue_log(log_msg))
    except RuntimeError:
        # No event loop running - skip WebSocket broadcast
        pass

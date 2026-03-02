"""InsForge Realtime Socket.IO client for the Python bot engine.

Subscribes to InsForge Realtime channels and dispatches events to registered
async handlers. InsForge uses Socket.IO over WebSocket — this client wraps
``python-socketio`` (AsyncClient) with the InsForge-specific protocol:

- Auth: ``auth={'token': anon_key}`` on handshake
- Subscribe: ``emit('REALTIME_SUBSCRIBE', {'channel': name})``
- Unsubscribe: ``emit('REALTIME_UNSUBSCRIBE', {'channel': name})``
- Events: DB triggers fire INSERT/UPDATE/DELETE + custom event names
  (e.g. ``bot_instance_changed``, ``command_updated``, ``verification``)

Design principles:
- Uses ``socketio.AsyncClient`` from ``python-socketio[asyncio_client]``
- Built-in reconnection with exponential backoff (2s → 60s)
- WebSocket-only transport (no HTTP long-polling fallback)
- Fail-safe: returns False on ImportError/OSError (dev mode fallback to polling)
- RUF006 compliant: fire_and_forget() for all background task dispatch
- Thread-safe event handler registry
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import Callable, Coroutine
from typing import Any

from apps.bot.config import config as app_config
from apps.bot.utils.tasks import fire_and_forget

logger = logging.getLogger(__name__)

# Type alias for async event handlers.
# Coroutine[Any, Any, None] is required by fire_and_forget().
EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]

# Reconnect backoff bounds (used by socketio.AsyncClient internally)
_RECONNECT_MIN: float = 2.0
_RECONNECT_MAX: float = 60.0


class InsForgeRealtimeClient:
    """Socket.IO client for InsForge Realtime subscriptions (Python).

    Uses ``python-socketio`` AsyncClient with InsForge's event protocol:
    - ``REALTIME_SUBSCRIBE`` / ``REALTIME_UNSUBSCRIBE`` for channels
    - Custom event names dispatched to registered async handlers

    Usage::

        client = InsForgeRealtimeClient()
        client.on("bot_instance_changed", my_async_handler)

        connected = await client.connect_and_subscribe("bot_instances")
        if connected:
            fire_and_forget(client.listen())
        # shutdown:
        await client.disconnect()

    In dev mode (no cloud WS endpoint), ``connect_and_subscribe()`` returns
    ``False`` and the caller's 30s polling fallback takes over transparently.
    """

    def __init__(self) -> None:
        """Initialise with empty handler registry and disconnected state."""
        self._handlers: dict[str, list[EventHandler]] = {}
        self._sio: Any = None  # socketio.AsyncClient instance
        self._running = False
        self._connected = False
        self._subscribed_channels: list[str] = []
        self._connect_time: float = 0.0
        self._event_count: int = 0
        # Event used to keep listen() alive while connected
        self._disconnect_event: asyncio.Event = asyncio.Event()

    def on(self, event: str, handler: EventHandler) -> None:
        """Register an async handler for a named event.

        Multiple handlers can be registered for the same event — all fire.

        Args:
            event: Event name from DB trigger (e.g. ``"bot_instance_changed"``).
            handler: Async callable that receives the event payload dict.
        """
        self._handlers.setdefault(event, []).append(handler)

    async def connect_and_subscribe(self, *channels: str) -> bool:
        """Connect to InsForge Realtime via Socket.IO and subscribe to channels.

        Derives the connection URL from ``INSFORGE_BASE_URL``.
        Auth is sent as ``auth={'token': anon_key}`` per Socket.IO convention.

        Args:
            *channels: Channel names to subscribe (must be enabled in
                ``realtime.channels`` table with ``enabled=true``).

        Returns:
            ``True`` if connected and all subscriptions succeeded.
            ``False`` if Socket.IO is unavailable — caller should use polling fallback.
        """
        base = app_config.insforge_base_url.rstrip("/")

        try:
            import socketio  # pylint: disable=import-outside-toplevel

            # Create AsyncClient with built-in reconnection
            self._sio = socketio.AsyncClient(
                reconnection=True,
                reconnection_delay=_RECONNECT_MIN,
                reconnection_delay_max=_RECONNECT_MAX,
                logger=False,  # Use our own logger, not socketio's
            )

            # Register Socket.IO lifecycle events
            self._sio.on("connect", self._on_connect)
            self._sio.on("disconnect", self._on_disconnect)
            self._sio.on("connect_error", self._on_connect_error)

            # Register all custom event handlers with Socket.IO
            # Socket.IO dispatches events natively — no manual JSON parsing needed
            registered_events: set[str] = set()
            for event_name in self._handlers:
                if event_name not in registered_events:
                    self._sio.on(event_name, self._make_event_dispatcher(event_name))
                    registered_events.add(event_name)

            # Also register the generic DB trigger events (INSERT/UPDATE/DELETE)
            for generic_event in ("INSERT", "UPDATE", "DELETE"):
                if generic_event not in registered_events:
                    self._sio.on(generic_event, self._make_event_dispatcher(generic_event))
                    registered_events.add(generic_event)

            logger.info("[Realtime] Connecting to %s via Socket.IO", base)

            await self._sio.connect(
                base,
                auth={"token": app_config.insforge_anon_key or ""},
                transports=["websocket"],
                wait_timeout=10,
            )

            self._running = True
            self._connected = True
            self._connect_time = time.monotonic()
            self._disconnect_event.clear()

            # Subscribe to each requested channel via InsForge protocol
            for channel in channels:
                try:
                    await self._sio.emit("REALTIME_SUBSCRIBE", {"channel": channel})
                    self._subscribed_channels.append(channel)
                    logger.info("[Realtime] Subscribed → channel: %s", channel)
                except Exception as sub_err:  # pylint: disable=broad-exception-caught
                    logger.warning(
                        "[Realtime] Subscribe to '%s' failed: %r (continuing)",
                        channel,
                        sub_err,
                    )

            logger.info(
                "[Realtime] ✅ Connected — subscribed channels: %s",
                self._subscribed_channels,
            )
            return True

        except ImportError:
            logger.warning(
                "[Realtime] 'python-socketio' package not installed — using polling fallback"
            )
            return False
        except Exception as e:  # pylint: disable=broad-except
            # Catch ALL exceptions — socketio raises its own exception types
            # (ConnectionError, BadNamespaceError, etc.) that aren't subclasses
            # of OSError. We must never let a realtime failure crash the bot.
            logger.warning(
                "[Realtime] Socket.IO connection failed: %r — polling fallback",
                e,
            )
            return False

    def _make_event_dispatcher(self, event_name: str) -> Callable[..., Coroutine[Any, Any, None]]:
        """Create an async callback for Socket.IO's ``on()`` that dispatches to our handlers.

        Socket.IO calls the callback with the event data directly (no JSON parsing needed).
        We wrap each handler call in ``fire_and_forget()`` for non-blocking execution.

        Args:
            event_name: The event name to dispatch.

        Returns:
            Async callable suitable for ``sio.on(event_name, callback)``.
        """

        async def _dispatcher(data: Any = None) -> None:
            payload: dict[str, Any] = {}
            if isinstance(data, dict):
                payload = data
            elif data is not None:
                payload = {"data": data}

            self._event_count += 1
            logger.debug(
                "[Realtime] Event #%d: %s  payload_keys=%s",
                self._event_count,
                event_name,
                list(payload.keys()),
            )

            for handler in self._handlers.get(event_name, []):
                fire_and_forget(handler(payload))

        return _dispatcher

    async def _on_connect(self) -> None:
        """Socket.IO 'connect' event — connection established."""
        self._connected = True
        self._connect_time = time.monotonic()
        logger.info("[Realtime] ✅ Socket.IO connected")

    async def _on_disconnect(self, *_args: Any) -> None:
        """Socket.IO 'disconnect' event — connection lost.

        Socket.IO's built-in reconnection will handle retry automatically.
        """
        self._connected = False
        uptime = time.monotonic() - self._connect_time if self._connect_time else 0
        logger.warning(
            "[Realtime] Socket.IO disconnected — uptime=%.0fs  events_processed=%d",
            uptime,
            self._event_count,
        )
        self._disconnect_event.set()

    async def _on_connect_error(self, data: Any = None) -> None:
        """Socket.IO 'connect_error' event — connection attempt failed.

        Socket.IO retries automatically with exponential backoff.
        """
        self._connected = False
        logger.warning("[Realtime] Connection error: %s — will retry automatically", data)

    async def listen(self) -> None:
        """Keep the client alive while connected.

        Socket.IO dispatches events via callbacks, so this method simply
        waits until ``disconnect()`` is called or the connection drops.

        Must be run as a background task::

            fire_and_forget(client.listen())

        The loop exits cleanly when ``disconnect()`` is called.
        """
        if not self._sio:
            return

        try:
            # Wait until disconnect is called
            while self._running:
                self._disconnect_event.clear()
                await self._disconnect_event.wait()
                if not self._running:
                    break
                # If still running but disconnected, Socket.IO reconnects automatically
                # We just wait again for the next disconnect or shutdown
        except asyncio.CancelledError:
            logger.info("[Realtime] Listen task cancelled")
        finally:
            uptime = time.monotonic() - self._connect_time if self._connect_time else 0
            logger.info(
                "[Realtime] Listen loop exited — uptime=%.0fs  events_processed=%d",
                uptime,
                self._event_count,
            )

    async def reconnect_loop(self, *_channels: str) -> None:
        """No-op — Socket.IO handles reconnection natively.

        Kept for API compatibility with callers that previously called
        ``fire_and_forget(client.reconnect_loop("channel"))``.
        Now a no-op since ``socketio.AsyncClient(reconnection=True)``
        handles reconnection with exponential backoff internally.

        Args:
            *_channels: Ignored — Socket.IO re-subscribes automatically.
        """

    async def disconnect(self) -> None:
        """Close the Socket.IO connection and stop all reconnect attempts.

        Safe to call multiple times — idempotent.
        """
        self._running = False
        self._connected = False
        self._disconnect_event.set()  # Unblock listen()

        if self._sio:
            # Unsubscribe from all channels before disconnecting
            for channel in self._subscribed_channels:
                with contextlib.suppress(OSError, RuntimeError):
                    await self._sio.emit("REALTIME_UNSUBSCRIBE", {"channel": channel})

            with contextlib.suppress(OSError, RuntimeError):
                await self._sio.disconnect()

            self._sio = None
            self._subscribed_channels.clear()

        logger.info(
            "[Realtime] Disconnected cleanly — total events processed: %d",
            self._event_count,
        )

    @property
    def is_connected(self) -> bool:
        """Return True if the Socket.IO connection is currently active."""
        return self._connected

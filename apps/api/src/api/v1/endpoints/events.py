"""SSE (Server-Sent Events) endpoint for real-time updates.

Provides a streaming endpoint that pushes events to connected clients.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from src.api.v1.dependencies.session import get_current_session
from src.core.events import EventBus, EventType

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from src.models.session import Session

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


async def event_generator(session: Session) -> AsyncIterator[str]:
    """Generate SSE events for a connected client.

    Args:
        session: Authenticated session.

    Yields:
        SSE-formatted event strings.
    """
    bus = await EventBus.get_instance()

    logger.info(
        "sse_client_connected",
        telegram_id=session.telegram_id,
        username=session.telegram_username,
    )

    # Start heartbeat task
    heartbeat_task = asyncio.create_task(heartbeat_loop(bus))

    try:
        async for event in bus.subscribe():
            yield event.to_sse()
    except asyncio.CancelledError:
        logger.info(
            "sse_client_disconnected",
            telegram_id=session.telegram_id,
        )
    finally:
        heartbeat_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await heartbeat_task


async def heartbeat_loop(bus: EventBus) -> None:
    """Send periodic heartbeat events to keep connection alive.

    Args:
        bus: Event bus to publish heartbeats to.
    """
    while True:
        await asyncio.sleep(30)  # Every 30 seconds
        await bus.publish(EventType.HEARTBEAT, {"status": "alive"})


@router.get(
    "/stream",
    response_class=StreamingResponse,
    summary="SSE Event Stream",
    description="Connect to receive real-time events via Server-Sent Events.",
)
async def stream_events(
    session: Session = Depends(get_current_session),
) -> StreamingResponse:
    """Stream real-time events to the client.

    Requires authentication via session cookie.
    Events include:
    - Activity updates
    - Verification events
    - Analytics updates
    - Log entries
    - System heartbeats

    Returns:
        StreamingResponse with text/event-stream content type.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for event stream",
        )

    return StreamingResponse(
        event_generator(session),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get(
    "/status",
    summary="Event Stream Status",
    description="Get the current status of the event stream.",
)
async def stream_status(
    _session: Session = Depends(get_current_session),
) -> dict:
    """Get event stream status.

    Returns:
        Current subscriber count and status.
    """
    bus = await EventBus.get_instance()
    return {
        "status": "active",
        "subscribers": bus.subscriber_count,
    }

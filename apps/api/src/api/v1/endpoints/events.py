"""SSE (Server-Sent Events) endpoint for real-time updates.

Provides a streaming endpoint that pushes events to connected clients.
Also includes an endpoint for external services (like the bot) to publish events.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.api.v1.dependencies.session import get_current_session
from src.core.events import EventBus, EventType

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from src.models.session import Session

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


# =============================================================================
# Pydantic Schemas
# =============================================================================


class PublishEventRequest(BaseModel):
    """Request schema for publishing an event."""

    event_type: str = Field(
        ...,
        description="Type of event to publish",
        examples=["verification", "stats_update", "activity"],
    )
    data: dict = Field(
        default_factory=dict,
        description="Event payload data",
        examples=[{"user_id": 123456, "success": True}],
    )


class PublishEventResponse(BaseModel):
    """Response schema for published event."""

    status: str = "published"
    event_type: str
    subscriber_count: int


# =============================================================================
# Helper Functions
# =============================================================================


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


# =============================================================================
# Endpoints
# =============================================================================


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


@router.post(
    "/publish",
    response_model=PublishEventResponse,
    summary="Publish Event",
    description="Publish an event to all SSE subscribers. Used by the bot for real-time updates.",
)
async def publish_event(
    request: PublishEventRequest = Body(...),
    session: Session = Depends(get_current_session),
) -> PublishEventResponse:
    """Publish an event to the SSE stream.

    This endpoint allows the bot or other authenticated services to push
    real-time updates to all connected dashboard clients.

    Valid event types:
    - `verification`: User verification completed
    - `stats_update`: Statistics have changed
    - `activity`: General activity event
    - `member_join`: New member joined a group
    - `member_leave`: Member left a group
    - `bot_status`: Bot status change
    - `log`: New log entry
    - `error`: Error event
    - `warning`: Warning event

    Returns:
        Confirmation with subscriber count.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to publish events",
        )

    # Validate event type
    try:
        event_enum = EventType(request.event_type)
    except ValueError as exc:
        valid_types = [e.value for e in EventType if e.value not in ("heartbeat", "connected")]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type: {request.event_type}. Valid types: {valid_types}",
        ) from exc

    bus = await EventBus.get_instance()
    await bus.publish(event_enum, request.data)

    logger.info(
        "event_published",
        event_type=request.event_type,
        subscriber_count=bus.subscriber_count,
        published_by=session.telegram_id,
    )

    return PublishEventResponse(
        status="published",
        event_type=request.event_type,
        subscriber_count=bus.subscriber_count,
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
        "event_types": [e.value for e in EventType],
    }


@router.post(
    "/bot/heartbeat",
    summary="Bot Heartbeat",
    description="Record a bot heartbeat for uptime tracking.",
)
async def bot_heartbeat(
    session: Session = Depends(get_current_session),
) -> dict:
    """Record a bot heartbeat.

    Called periodically by the bot to indicate it's alive.
    Updates the uptime tracker.

    Returns:
        Acknowledgement with uptime info.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for bot heartbeat",
        )

    from src.services.uptime_service import get_uptime_tracker

    tracker = get_uptime_tracker()
    await tracker.record_heartbeat()

    return {
        "status": "ok",
        "uptime_seconds": await tracker.get_uptime_seconds(),
    }


@router.post(
    "/bot/start",
    summary="Record Bot Start",
    description="Record that the bot has started.",
)
async def record_bot_start(
    session: Session = Depends(get_current_session),
) -> dict:
    """Record that the bot has started.

    Called once when the bot starts up.
    Initializes the uptime counter.

    Returns:
        Acknowledgement.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    from src.services.uptime_service import get_uptime_tracker

    tracker = get_uptime_tracker()
    await tracker.record_bot_start()

    # Also publish a bot_status event
    bus = await EventBus.get_instance()
    await bus.publish(EventType.BOT_STATUS, {"status": "online"})

    logger.info("bot_started", recorded_by=session.telegram_id)

    return {"status": "started"}


@router.post(
    "/bot/stop",
    summary="Record Bot Stop",
    description="Record that the bot has stopped.",
)
async def record_bot_stop(
    session: Session = Depends(get_current_session),
) -> dict:
    """Record that the bot has stopped.

    Called when the bot is shutting down.

    Returns:
        Acknowledgement.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    from src.services.uptime_service import get_uptime_tracker

    tracker = get_uptime_tracker()
    await tracker.record_bot_stop()

    # Also publish a bot_status event
    bus = await EventBus.get_instance()
    await bus.publish(EventType.BOT_STATUS, {"status": "offline"})

    logger.info("bot_stopped", recorded_by=session.telegram_id)

    return {"status": "stopped"}


@router.get(
    "/bot/status",
    summary="Get Bot Status",
    description="Get the current bot status and uptime.",
)
async def get_bot_status(
    _session: Session = Depends(get_current_session),
) -> dict:
    """Get the current bot status.

    Returns:
        Bot status including uptime, start time, and last heartbeat.
    """
    from src.services.uptime_service import get_uptime_tracker

    tracker = get_uptime_tracker()
    return await tracker.get_status()

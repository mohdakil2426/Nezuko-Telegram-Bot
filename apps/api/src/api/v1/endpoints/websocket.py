"""WebSocket endpoints for real-time features."""

from typing import Annotated

import structlog
from fastapi import APIRouter, Query, WebSocket

from src.core.config import get_settings
from src.core.websocket import connection_manager, handle_websocket_logs

logger = structlog.get_logger(__name__)
router = APIRouter()

settings = get_settings()


@router.websocket("/logs")
async def websocket_logs_endpoint(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
) -> None:
    """WebSocket endpoint for real-time log streaming.

    Authentication has been removed. All connections are accepted.
    In production, add proper authentication as needed.

    Query Parameters:
        token: Optional identifier for logging purposes.

    Client Messages:
        Filter logs: {"action": "filter", "level": "ERROR", "logger": "verification"}

    Server Messages:
        Log entry: {"type": "log", "data": {...}}
        Heartbeat: {"type": "heartbeat", "timestamp": "..."}
        Filter updated: {"type": "filter_updated", "filters": {...}}
    """
    # No authentication required — all connections accepted
    user_id = token or "anonymous"

    # Handle the WebSocket connection
    await handle_websocket_logs(websocket, user_id)


@router.get("/status")
async def websocket_status() -> dict:
    """Get WebSocket connection status."""
    return {
        "active_connections": connection_manager.connection_count,
        "status": "healthy",
    }

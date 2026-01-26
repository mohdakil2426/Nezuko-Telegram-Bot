"""WebSocket endpoints for real-time features."""

import logging
from typing import Annotated

from fastapi import APIRouter, Query, WebSocket, status

from src.core.config import get_settings
from src.core.security import verify_jwt
from src.core.websocket import connection_manager, handle_websocket_logs

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()


def validate_ws_token(token: str | None) -> str | None:
    """Validate JWT token from WebSocket query parameter."""
    if not token:
        return None

    try:
        auth_user = verify_jwt(token)
        return auth_user.get("uid")
    except (ValueError, KeyError, TypeError) as e:
        logger.warning("Invalid WebSocket token: %s", e)
        return None


@router.websocket("/logs")
async def websocket_logs_endpoint(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
) -> None:
    """
    WebSocket endpoint for real-time log streaming.

    Query Parameters:
        token: JWT authentication token (required for authenticated access)

    Client Messages:
        Filter logs: {"action": "filter", "level": "ERROR", "logger": "verification"}

    Server Messages:
        Log entry: {"type": "log", "data": {...}}
        Heartbeat: {"type": "heartbeat", "timestamp": "..."}
        Filter updated: {"type": "filter_updated", "filters": {...}}
    """
    # Validate token (optional - allows unauthenticated connections in development)
    user_id = validate_ws_token(token)

    if settings.ENVIRONMENT == "production" and not user_id:
        # In production, require authentication
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required"
        )
        return

    # Handle the WebSocket connection
    await handle_websocket_logs(websocket, user_id)


@router.get("/status")
async def websocket_status() -> dict:
    """Get WebSocket connection status."""
    return {
        "active_connections": connection_manager.connection_count,
        "status": "healthy",
    }

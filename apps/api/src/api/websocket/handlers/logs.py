from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..manager import manager  # type: ignore

router = APIRouter()


@router.websocket("/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket) -> None:
    # TODO: Add authentication (extract token from query param)
    await manager.connect(websocket, channel="logs")
    try:
        while True:
            # We don't expect client messages, just keep connection alive
            # Wait for messages (maybe ping/pong)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel="logs")
    except Exception:
        manager.disconnect(websocket, channel="logs")

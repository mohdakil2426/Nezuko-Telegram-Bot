from typing import List, Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # active_connections: channel_name -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "logs"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "logs"):
        if channel in self.active_connections:
            try:
                self.active_connections[channel].remove(websocket)
                if not self.active_connections[channel]:
                    del self.active_connections[channel]
            except ValueError:
                pass

    async def broadcast(self, message: dict, channel: str = "logs"):
        if channel in self.active_connections:
            # Iterate over a copy to handle disconnection during iteration
            for connection in self.active_connections[channel][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # If send fails, assume disconnected and remove
                    self.disconnect(connection, channel)


manager = ConnectionManager()

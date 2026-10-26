import asyncio
import json
import logging
from typing import Any, Dict, List
from fastapi import WebSocket

logger = logging.getLogger("olivia.copilot_ws")


class CopilotConnectionManager:

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"[WebSocket Copilot] Nuevo cliente conectado. Total activos: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(
                f"[WebSocket Copilot] Cliente desconectado. Total activos: {len(self.active_connections)}"
            )

    async def broadcast(self, message: Dict[str, Any]):
        """Envía un evento JSON a todos los clientes WebSocket activos."""
        if not self.active_connections:
            logger.info(
                f"[WebSocket Copilot] Evento '{message.get('type')}' generado pero no hay agentes conectados en WebSocket."
            )
            return

        logger.info(
            f"[WebSocket Copilot] Transmitiendo '{message.get('type')}' a {len(self.active_connections)} agente(s)."
        )

        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WebSocket Copilot] Error enviando a cliente: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


copilot_ws_manager = CopilotConnectionManager()

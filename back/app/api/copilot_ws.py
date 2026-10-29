import asyncio
import json
import logging
from typing import Any, Dict, List
from fastapi import WebSocket

logger = logging.getLogger("olivia.copilot_ws")


class CopilotConnectionManager:

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.current_call: Dict[str, Any] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"[WebSocket Copilot] Nuevo cliente conectado. Total activos: {len(self.active_connections)}"
        )
        if self.current_call:
            try:
                await websocket.send_json(self.current_call)
                logger.info(
                    f"[WebSocket Copilot] Llamada activa sincronizada con nuevo cliente: call_id={self.current_call.get('call_id')}"
                )
            except Exception as e:
                logger.warning(f"[WebSocket Copilot] Error sincronizando llamada activa: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(
                f"[WebSocket Copilot] Cliente desconectado. Total activos: {len(self.active_connections)}"
            )

    async def broadcast(self, message: Dict[str, Any]):
        msg_type = message.get("type")
        if msg_type == "CALL_STARTED":
            self.current_call = message
        elif msg_type == "CALL_ENDED":
            self.current_call = None

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

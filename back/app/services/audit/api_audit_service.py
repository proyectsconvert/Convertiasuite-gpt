"""
Servicio de auditoría para las llamadas de API Keys externas.
Registra cada request en la tabla api_request_logs de forma no bloqueante.
"""
import asyncio
import logging
from datetime import datetime, UTC
from typing import Optional

from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


async def log_api_request(
    *,
    api_key_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    end_user_id: Optional[str] = None,
    internal_user_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    department_id: Optional[str] = None,
    session_id: Optional[str] = None,
    duration_ms: Optional[int] = None,
    message_preview: Optional[str] = None,
    response_preview: Optional[str] = None,
    error_detail: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Registra una llamada de API Key en la tabla api_request_logs.
    Se ejecuta de forma no bloqueante — un fallo aquí nunca interrumpe
    la respuesta al cliente.
    """
    try:
        payload = {
            "api_key_id": api_key_id,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
        }

        # Campos opcionales — solo incluir si tienen valor
        if end_user_id:
            payload["end_user_id"] = end_user_id
        if internal_user_id:
            payload["internal_user_id"] = internal_user_id
        if campaign_id:
            payload["campaign_id"] = campaign_id
        if department_id:
            payload["department_id"] = department_id
        if session_id:
            payload["session_id"] = session_id
        if duration_ms is not None:
            payload["duration_ms"] = duration_ms
        if error_detail:
            payload["error_detail"] = error_detail[:1000]  # limitar tamaño
        if ip_address:
            payload["ip_address"] = ip_address
        if user_agent:
            payload["user_agent"] = user_agent[:500]

        # Guardar solo preview del mensaje/respuesta (privacidad)
        if message_preview:
            payload["message_preview"] = message_preview[:100]
        if response_preview:
            payload["response_preview"] = response_preview[:100]

        supabase = SupabaseClient().admin
        await asyncio.to_thread(
            lambda: supabase.table("api_request_logs").insert(payload).execute()
        )

    except Exception as e:
        # Error no fatal — solo logueamos, nunca interrumpimos el flujo
        logger.warning("Error registrando api_request_log: %s", str(e))

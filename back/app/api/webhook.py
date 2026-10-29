import asyncio
import json
import logging
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from app.api.copilot_ws import copilot_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])

_MAX_DEBUG_HISTORY = 20
_recent_payloads: List[Dict[str, Any]] = []


def _get_configured_token() -> str:
    raw = (
        os.getenv("INCONCERT_WEBHOOK_TOKEN")
        or os.getenv('"INCONCERT_WEBHOOK_TOKEN"')
        or "zU9rSanNamRdd9548YwnLVSLB6aMNbU7czhkkSEmA8c"
    )
    return raw.strip().strip('"').strip("'")


WEBHOOK_TOKEN = _get_configured_token()


def _extract_token(request: Request, path_token: Optional[str] = None) -> str:
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    if "X-API-Key" in request.headers:
        return request.headers["X-API-Key"].strip()
    if "X-Webhook-Token" in request.headers:
        return request.headers["X-Webhook-Token"].strip()
    if path_token:
        return path_token.strip()
    if "token" in request.query_params:
        return request.query_params["token"].strip()
    return ""


async def _is_valid_token(token: str) -> bool:
    if not token:
        return False
    cleaned = token.strip()
    if WEBHOOK_TOKEN and secrets.compare_digest(cleaned, WEBHOOK_TOKEN):
        return True

    # Validar contra api_keys activas en Supabase
    try:
        from app.infra.clients.supabase_client import SupabaseClient
        supabase = SupabaseClient().admin
        res = await asyncio.to_thread(
            lambda: supabase.table("api_keys")
            .select("id")
            .eq("api_key", cleaned)
            .eq("is_active", True)
            .execute()
        )
        if res.data:
            return True
    except Exception as e:
        logger.warning(f"Error verificando api_keys en Supabase: {e}")

    return False


async def _handle_inconcert_event(request: Request, path_token: Optional[str] = None):
    token = _extract_token(request, path_token)
    if not await _is_valid_token(token):
        raise HTTPException(
            status_code=401,
            detail=(
                "No autorizado: Token o API Key de webhook inválido o ausente. "
                "Envíe la clave en el Header 'Authorization: Bearer <TOKEN>' o 'X-API-Key: <TOKEN>'."
            ),
        )

    raw = await request.body()
    try:
        payload = json.loads(raw) if raw else {}
    except ValueError:
        payload = {"raw": raw.decode("utf-8", errors="replace")} if raw else {}

    if not isinstance(payload, dict):
        payload = {"data": payload}

    query_params = dict(request.query_params)
    client_ip = request.client.host if request.client else "unknown"
    now_iso = datetime.now(timezone.utc).isoformat()

    print("\n" + "=" * 70, flush=True)
    print(f"📥 [inConcert Webhook Recibido] {now_iso} desde {client_ip}", flush=True)
    print(f"   Query Params: {query_params}", flush=True)
    print("   Payload JSON:", flush=True)
    print(json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
    print("=" * 70 + "\n", flush=True)

    logger.info(
        "inConcert webhook | ip=%s | query=%s | payload=%s",
        client_ip,
        query_params,
        payload,
    )

    event_raw = str(
        payload.get("notificationType")
        or payload.get("NotificationType")
        or payload.get("event")
        or payload.get("type")
        or query_params.get("event")
        or query_params.get("action")
        or "unknown"
    ).lower().strip()

    interaction_info = payload.get("interaction") if isinstance(payload.get("interaction"), dict) else {}
    call_id = (
        payload.get("interactionId")
        or payload.get("interaction_id")
        or interaction_info.get("id")
        or interaction_info.get("interactionId")
        or payload.get("call_id")
        or payload.get("id")
        or query_params.get("call_id")
        or query_params.get("interactionId")
        or f"inc-{secrets.token_hex(4)}"
    )

    agent_info = payload.get("agent") if isinstance(payload.get("agent"), dict) else {}
    agent_username = (
        agent_info.get("userName")
        or agent_info.get("username")
        or agent_info.get("email")
        or agent_info.get("id")
        or payload.get("agentUsername")
        or payload.get("agentId")
        or payload.get("agent_id")
        or query_params.get("agent")
    )

    contact_info = payload.get("contact") if isinstance(payload.get("contact"), dict) else {}
    customer_phone = (
        contact_info.get("phone")
        or contact_info.get("telephone")
        or contact_info.get("ani")
        or payload.get("phone")
        or payload.get("ani")
        or query_params.get("phone")
    )
    customer_name = (
        contact_info.get("name")
        or contact_info.get("fullName")
        or payload.get("contactName")
        or payload.get("client_name")
        or query_params.get("client_name")
    )

    campaign_info = payload.get("campaign") if isinstance(payload.get("campaign"), dict) else {}
    campaign_name = (
        campaign_info.get("name")
        or campaign_info.get("id")
        or payload.get("campaignId")
        or payload.get("campaignName")
        or payload.get("campaign_name")
        or query_params.get("campaign")
        or "default"
    )

    agent_status = (
        agent_info.get("status")
        or agent_info.get("state")
        or payload.get("agentStatus")
        or payload.get("status")
    )

    # Eventos de interacción que inician una llamada/chat
    _CALL_START_EVENTS = {
        "newinbound", "newoutbound", "nueva entrante", "nueva saliente",
        "interactiontaken", "interacción tomada", "interaccion tomada",
        "interactionassigned", "interacción asignada", "interaccion asignada",
    }

    # Eventos de interacción que finalizan una llamada/chat
    _CALL_END_EVENTS = {
        "interactiondeleted", "interacción eliminada", "interaccion eliminada",
        "statuschangetofinish", "cambiar de estado para terminar",
        "statuschangetoclosed", "cambiar estado a cerrado",
        "statuschangetocanceled", "cambiar estado a cancelado",
        "statuschangetocancelled",
        "close", "cancel", "end", "finish", "wrapup", "hangup",
    }

    # Eventos de mensajes en interacciones activas
    _MESSAGE_EVENTS = {
        "newinboundmessage", "nuevo mensaje entrante",
        "newoutboundmessage", "nuevo mensaje saliente",
        "firstagentmessage", "primer mensaje de agente",
    }

    # Eventos de cola y transferencia
    _INTERACTION_UPDATE_EVENTS = {
        "interactioninqueue", "interacción en cola", "interaccion en cola",
        "interactiontransferred", "interacción transferida", "interaccion transferida",
        "statuschangetoreceive", "cambiar estado para recibir",
        "statuschangetowaiting", "cambiar estado a esperando",
    }

    # Eventos de sesión de agente
    _AGENT_SESSION_EVENTS = {
        "agentlogin", "inicia sesión", "inicia sesion",
        "agentlogout", "cierra sesión", "cierra sesion",
        "agentstatuschange", "cambia estado",
        "agentassignedtocampaign", "asignado a campaña", "asignado a campana",
        "agentremovedfromcampaign", "removido de campaña", "removido de campana",
    }

    # Determinar el tipo de evento WebSocket
    if event_raw in _CALL_START_EVENTS:
        ws_event = {
            "type": "CALL_STARTED",
            "call_id": call_id,
            "agent_username": agent_username,
            "customer_phone": customer_phone,
            "customer_name": customer_name,
            "campaign_id": campaign_name,
            "raw_event": event_raw,
            "timestamp": time.time(),
            "payload": payload,
        }
    elif event_raw in _CALL_END_EVENTS:
        ws_event = {
            "type": "CALL_ENDED",
            "call_id": call_id,
            "agent_username": agent_username,
            "raw_event": event_raw,
            "timestamp": time.time(),
        }
    elif event_raw in _MESSAGE_EVENTS:
        message_info = payload.get("message") if isinstance(payload.get("message"), dict) else {}
        ws_event = {
            "type": "MESSAGE_RECEIVED",
            "call_id": call_id,
            "agent_username": agent_username,
            "message_text": message_info.get("text") or message_info.get("body") or "",
            "message_direction": "inbound" if "inbound" in event_raw or "entrante" in event_raw else "outbound",
            "is_first_agent_message": "first" in event_raw or "primer" in event_raw,
            "raw_event": event_raw,
            "timestamp": time.time(),
        }
    elif event_raw in _INTERACTION_UPDATE_EVENTS:
        ws_event = {
            "type": "INTERACTION_UPDATE",
            "call_id": call_id,
            "agent_username": agent_username,
            "update_type": event_raw,
            "raw_event": event_raw,
            "timestamp": time.time(),
        }
    elif event_raw in _AGENT_SESSION_EVENTS:
        is_login = any(kw in event_raw for kw in ("login", "inicia"))
        is_logout = any(kw in event_raw for kw in ("logout", "cierra"))
        ws_event = {
            "type": "AGENT_SESSION",
            "agent_username": agent_username,
            "agent_status": agent_status,
            "session_action": "login" if is_login else "logout" if is_logout else "status_change",
            "campaign_id": campaign_name,
            "raw_event": event_raw,
            "timestamp": time.time(),
        }
    else:
        # Fallback: intentar clasificar por keywords para eventos no mapeados
        is_closing = any(
            kw in event_raw
            for kw in ("close", "cancel", "end", "finish", "delete", "hangup", "eliminada", "cerrado", "cancelado", "terminar")
        )
        if is_closing:
            ws_event = {
                "type": "CALL_ENDED",
                "call_id": call_id,
                "agent_username": agent_username,
                "raw_event": event_raw,
                "timestamp": time.time(),
            }
        else:
            ws_event = {
                "type": "WEBHOOK_EVENT",
                "call_id": call_id,
                "agent_username": agent_username,
                "raw_event": event_raw,
                "timestamp": time.time(),
                "payload": payload,
            }

    record = {
        "received_at": now_iso,
        "client_ip": client_ip,
        "query_params": query_params,
        "raw_payload": payload,
        "extracted_event": ws_event,
    }
    _recent_payloads.insert(0, record)
    if len(_recent_payloads) > _MAX_DEBUG_HISTORY:
        _recent_payloads.pop()

    await copilot_ws_manager.broadcast(ws_event)
    print(
        f"[inConcert Webhook] Evento '{ws_event['type']}' ({event_raw}) emitido por WebSocket | call_id={call_id} | agente={agent_username}",
        flush=True,
    )

    return {
        "status": "received",
        "event": ws_event["type"],
        "raw_event": event_raw,
        "call_id": call_id,
        "agent": agent_username,
    }


# --- RUTAS DE CONSULTA Y DEBUG (Definidas PRIMERO para evitar conflictos con {token}) ---

@router.get("/inconcert/latest", tags=["webhooks"])
async def get_latest_webhook_payload():
    """Devuelve el último payload recibido desde inConcert."""
    if not _recent_payloads:
        return {
            "message": "Aún no se ha recibido ninguna notificación de webhook desde que inició el servidor.",
            "status": "waiting_for_first_call",
            "latest_payload": None,
        }
    return _recent_payloads[0]


@router.get("/inconcert/history", tags=["webhooks"])
async def get_webhook_history():
    """Devuelve el historial de los últimos 20 payloads recibidos desde inConcert."""
    return {
        "total_recorded": len(_recent_payloads),
        "history": _recent_payloads,
    }


# --- RUTAS PRINCIPALES CON HEADERS (POST /v1/webhooks/inconcert) ---

@router.post("/inconcert", tags=["webhooks"], summary="Recibir webhook de inConcert con cabeceras de autorización")
async def inconcert_webhook_headers(request: Request):
    """
    Recibe eventos de webhook de inConcert autenticados mediante Headers:
    - Authorization: Bearer <TOKEN>
    - o X-API-Key: <TOKEN>
    """
    return await _handle_inconcert_event(request)


@router.get("/inconcert", tags=["webhooks"], summary="Verificar estado de webhook inConcert")
async def inconcert_webhook_check_headers(request: Request):
    """Verifica el estado del webhook con autenticación vía Headers."""
    token = _extract_token(request)
    if not await _is_valid_token(token):
        raise HTTPException(
            status_code=401,
            detail="Token o API Key de webhook no autorizado o ausente en Headers.",
        )
    return {"status": "ok", "message": "Webhook inConcert activo y autenticación válida."}


# --- RUTAS DE COMPATIBILIDAD CON TOKEN EN URL ---

@router.post("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook_nested(token: str, request: Request):
    return await _handle_inconcert_event(request, path_token=token)


@router.post("/{token}", include_in_schema=False)
async def inconcert_webhook_direct(token: str, request: Request):
    return await _handle_inconcert_event(request, path_token=token)


@router.get("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook_check(token: str):
    if not await _is_valid_token(token):
        raise HTTPException(status_code=401, detail="Token no autorizado.")
    return {"status": "ok", "message": "Webhook inConcert activo y listo."}
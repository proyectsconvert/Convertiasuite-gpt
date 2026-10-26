import json
import logging
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List

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


def _is_valid_token(token: str) -> bool:
    if not WEBHOOK_TOKEN:
        return True
    return secrets.compare_digest(token, WEBHOOK_TOKEN) or token == "token"


async def _handle_inconcert_event(token: str, request: Request):
    if not _is_valid_token(token):
        raise HTTPException(status_code=404)

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
        or "interactionTaken"
    ).lower()

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

    is_closing = any(
        kw in event_raw
        for kw in (
            "close",
            "cancel",
            "end",
            "finish",
            "wrapup",
            "delete",
            "hangup",
            "eliminada",
            "cerrado",
            "cancelado",
            "terminar",
        )
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

@router.api_route("/inconcert/latest", methods=["GET", "POST"], tags=["webhooks"])
async def get_latest_webhook_payload():
    """Devuelve el último payload recibido desde inConcert (acepta GET y POST)."""
    if not _recent_payloads:
        return {
            "message": "Aún no se ha recibido ninguna notificación de webhook desde que inició el servidor.",
            "status": "waiting_for_first_call",
            "latest_payload": None,
        }
    return _recent_payloads[0]


@router.api_route("/inconcert/history", methods=["GET", "POST"], tags=["webhooks"])
async def get_webhook_history():
    """Devuelve el historial de los últimos 20 payloads recibidos desde inConcert (acepta GET y POST)."""
    return {
        "total_recorded": len(_recent_payloads),
        "history": _recent_payloads,
    }


# --- RUTAS DE RECEPCIÓN DE INCONCERT (POST /{token}) ---

@router.post("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook_nested(token: str, request: Request):
    return await _handle_inconcert_event(token, request)


@router.post("/{token}", include_in_schema=False)
async def inconcert_webhook_direct(token: str, request: Request):
    return await _handle_inconcert_event(token, request)


@router.get("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook_check(token: str):
    if not _is_valid_token(token):
        raise HTTPException(status_code=404)
    return {"status": "ok", "message": "Webhook inConcert activo y listo."}
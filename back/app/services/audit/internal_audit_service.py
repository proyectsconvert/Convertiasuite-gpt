"""
Servicio de auditoría interna para operaciones del sistema.
Registra qué hizo cada admin (crear, actualizar, eliminar) y exactamente qué cambió.

Uso básico:
    from app.services.audit.internal_audit_service import audit_log

    await audit_log(
        supabase=supabase,
        user_id=current_user["id"],
        action="update",
        entity_type="campaign",
        entity_id=campaign_id,
        old_value=old_data,
        new_value=new_data,
        ip_address=request.client.host,
    )
"""
import asyncio
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

# Acciones estándar
ACTION_CREATE = "create"
ACTION_UPDATE = "update"
ACTION_DELETE = "delete"
ACTION_REVOKE = "revoke"
ACTION_ACTIVATE = "activate"
ACTION_LOGIN    = "login"
ACTION_LOGOUT   = "logout"

# Entidades del sistema
ENTITY_CAMPAIGN    = "campaign"
ENTITY_API_KEY     = "api_key"
ENTITY_USER        = "user"
ENTITY_ROLE        = "role"
ENTITY_DEPARTMENT  = "department"
ENTITY_QUICK_ACTION = "quick_action"


def _detect_changed_fields(old: dict, new: dict) -> list[str]:
    """Detecta qué campos cambiaron entre old y new."""
    if not old or not new:
        return []
    changed = []
    all_keys = set(old.keys()) | set(new.keys())
    for key in all_keys:
        if old.get(key) != new.get(key):
            changed.append(key)
    return sorted(changed)


def _build_description(action: str, entity_type: str, changed_fields: list[str],
                        old: dict | None, new: dict | None) -> str:
    """Genera una descripción legible del cambio."""
    entity_labels = {
        ENTITY_CAMPAIGN: "campaña",
        ENTITY_API_KEY: "API Key",
        ENTITY_USER: "usuario",
        ENTITY_ROLE: "rol",
        ENTITY_DEPARTMENT: "departamento",
        ENTITY_QUICK_ACTION: "acción rápida",
    }
    label = entity_labels.get(entity_type, entity_type)

    if action == ACTION_CREATE:
        name = (new or {}).get("campaign_name") or (new or {}).get("client_name") or (new or {}).get("name", "")
        return f"Se creó {label}{f': {name!r}' if name else ''}"

    if action == ACTION_DELETE or action == ACTION_REVOKE:
        name = (old or {}).get("campaign_name") or (old or {}).get("client_name") or (old or {}).get("name", "")
        verb = "eliminó" if action == ACTION_DELETE else "revocó"
        return f"Se {verb} {label}{f': {name!r}' if name else ''}"

    if action == ACTION_UPDATE and changed_fields:
        parts = []
        for field in changed_fields[:3]:  # máximo 3 campos en la descripción
            old_val = (old or {}).get(field, "—")
            new_val = (new or {}).get(field, "—")
            parts.append(f"{field}: {old_val!r} → {new_val!r}")
        suffix = f" (+{len(changed_fields) - 3} más)" if len(changed_fields) > 3 else ""
        return f"Se actualizó {label}: {', '.join(parts)}{suffix}"

    return f"Acción '{action}' sobre {label}"


async def audit_log(
    *,
    supabase,
    user_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    description: Optional[str] = None,
) -> None:
    """
    Registra una operación interna en audit_logs.
    No bloqueante — un fallo aquí nunca interrumpe la operación principal.

    Args:
        supabase:      Cliente Supabase admin.
        user_id:       UUID del admin que realizó la acción.
        action:        Tipo de acción (usar constantes ACTION_*).
        entity_type:   Tipo de entidad afectada (usar constantes ENTITY_*).
        entity_id:     UUID de la entidad afectada.
        old_value:     Estado anterior de la entidad (para updates/deletes).
        new_value:     Estado nuevo de la entidad (para creates/updates).
        metadata:      Datos adicionales en formato libre.
        ip_address:    IP del cliente.
        user_agent:    User-Agent del cliente.
        description:   Descripción legible (se auto-genera si no se provee).
    """
    try:
        changed_fields = _detect_changed_fields(old_value or {}, new_value or {})

        payload: dict[str, Any] = {
            "action": action,
            "entity_type": entity_type,
            "description": description or _build_description(
                action, entity_type, changed_fields, old_value, new_value
            ),
        }

        if user_id:
            payload["user_id"] = user_id
        if entity_id:
            payload["entity_id"] = entity_id
        if old_value is not None:
            payload["old_value"] = old_value
        if new_value is not None:
            payload["new_value"] = new_value
        if changed_fields:
            payload["changed_fields"] = changed_fields
        if metadata:
            payload["metadata"] = metadata
        if ip_address:
            payload["ip_address"] = ip_address
        if user_agent:
            payload["user_agent"] = user_agent[:500]

        await asyncio.to_thread(
            lambda: supabase.table("audit_logs").insert(payload).execute()
        )

    except Exception as e:
        # No fatal — solo registramos en logs del servidor
        logger.warning("Error registrando audit_log action=%s entity=%s: %s", action, entity_type, str(e))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging
import secrets
from app.dependencies.auth import require_admin
from app.infra.clients.supabase_client import SupabaseClient
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api-keys",
    tags=["admin-api-keys"],
)

class CreateApiKeyRequest(BaseModel):
    client_name: str

@router.get("")
async def get_api_keys(current_user: dict = Depends(require_admin)):
    try:
        supabase = SupabaseClient().admin
        res = await asyncio.to_thread(
            lambda: supabase.table("api_keys")
            .select("id, client_name, is_active, created_at")
            .order("created_at", desc=True)
            .execute()
        )
        return {"status": "success", "api_keys": res.data or []}
    except Exception as e:
        logger.error(f"Error fetching api keys: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo API Keys")

@router.post("")
async def create_api_key(body: CreateApiKeyRequest, current_user: dict = Depends(require_admin)):
    try:
        supabase = SupabaseClient().admin
        
        # Generar una clave segura (ej: sk_live_8f7d6e5c...)
        raw_key = "sk_live_" + secrets.token_urlsafe(32)
        
        data = {
            "api_key": raw_key,
            "client_name": body.client_name,
            "is_active": True
        }
        
        res = await asyncio.to_thread(
            lambda: supabase.table("api_keys").insert(data).execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=400, detail="No se pudo crear la API Key")
            
        new_key = res.data[0]
        
        # OJO: Solo la devolvemos UNA vez en el POST. El GET nunca devuelve la llave real por seguridad.
        return {
            "status": "success",
            "api_key_data": {
                "id": new_key["id"],
                "api_key": raw_key,  # ¡Mostrar esto en la UI para que el usuario lo copie!
                "client_name": new_key["client_name"],
                "created_at": new_key["created_at"]
            }
        }
    except Exception as e:
        logger.error(f"Error creating api key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creando API Key")

@router.delete("/{key_id}")
async def revoke_api_key(key_id: str, current_user: dict = Depends(require_admin)):
    try:
        supabase = SupabaseClient().admin
        # En lugar de borrarla físicamente, podemos simplemente desactivarla
        res = await asyncio.to_thread(
            lambda: supabase.table("api_keys")
            .update({"is_active": False})
            .eq("id", key_id)
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="API Key no encontrada")
            
        return {"status": "success", "message": "API Key revocada"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking api key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error revocando API Key")


@router.get("/{key_id}/logs")
async def get_api_key_logs(
    key_id: str,
    limit: int = 50,
    offset: int = 0,
    status_code: int | None = None,
    end_user_id: str | None = None,
    current_user: dict = Depends(require_admin),
):
    """
    Devuelve el historial de requests realizados con una API Key específica.
    Útil para auditoría, debugging y control de uso por cliente.
    """
    try:
        supabase = SupabaseClient().admin

        # Verificar que la key existe
        key_res = await asyncio.to_thread(
            lambda: supabase.table("api_keys")
            .select("id, client_name")
            .eq("id", key_id)
            .maybe_single()
            .execute()
        )
        if not key_res.data:
            raise HTTPException(status_code=404, detail="API Key no encontrada")

        # Construir query de logs con filtros opcionales
        query = (
            supabase.table("api_request_logs")
            .select("*")
            .eq("api_key_id", key_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if status_code is not None:
            query = query.eq("status_code", status_code)
        if end_user_id:
            query = query.eq("end_user_id", end_user_id)

        logs_res = await asyncio.to_thread(lambda: query.execute())

        # Resumen de estadísticas rápidas
        stats_res = await asyncio.to_thread(
            lambda: supabase.table("api_request_logs")
            .select("status_code, duration_ms")
            .eq("api_key_id", key_id)
            .execute()
        )
        all_logs = stats_res.data or []
        total_requests = len(all_logs)
        errors = sum(1 for l in all_logs if l["status_code"] >= 400)
        avg_duration = (
            int(sum(l["duration_ms"] for l in all_logs if l.get("duration_ms")) / total_requests)
            if total_requests > 0 else 0
        )

        return {
            "status": "success",
            "api_key": key_res.data,
            "stats": {
                "total_requests": total_requests,
                "errors": errors,
                "success_rate": round((total_requests - errors) / total_requests * 100, 1) if total_requests else 0,
                "avg_duration_ms": avg_duration,
            },
            "logs": logs_res.data or [],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching api key logs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo logs de API Key")


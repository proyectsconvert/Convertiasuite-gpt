from typing import Any
import logging
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

DEFAULT_CAMPAIGN_CONTEXT: dict[str, Any] = {
    "has_active_campaign": False,
    "campaign_id": None,
    "campaign_name": None,
    "campaign_role": None,
    "tracking_format": {},
    "pricing_config": {},
    "platform_config": {},
}


async def get_agent_active_campaign_context(
    supabase: SupabaseClient | Any,
    user_id: str,
) -> dict[str, Any]:
    """
    Obtiene el contexto de la campaña activa de un agente.

    Regla de negocio:
    un agente debe pertenecer como máximo a una campaña activa.
    """
    try:
        db = getattr(supabase, "db", supabase)
        response = (
            db
            .table("campaign_members")
            .select(
                """
                campaign_id,
                campaign_role,
                campaigns (
                    campaign_name,
                    tracking_format,
                    pricing_config,
                    platform_config,
                    is_active
                )
                """
            )
            .eq("user_id", user_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not response.data:
            return DEFAULT_CAMPAIGN_CONTEXT.copy()

        member = response.data[0]
        campaign = member.get("campaigns")

        if not campaign or not campaign.get("is_active", True):
            return DEFAULT_CAMPAIGN_CONTEXT.copy()

        return {
            "has_active_campaign": True,
            "campaign_id": member.get("campaign_id"),
            "campaign_name": campaign.get("campaign_name"),
            "campaign_role": member.get("campaign_role"),
            "tracking_format": campaign.get("tracking_format") or {},
            "pricing_config": campaign.get("pricing_config") or {},
            "platform_config": campaign.get("platform_config") or {},
        }

    except Exception as e:
        logger.warning(
            f"[WARN] Error obteniendo campaña activa "
            f"del agente {user_id}: {e}"
        )
        return DEFAULT_CAMPAIGN_CONTEXT.copy()


async def get_user_campaigns(
    supabase: SupabaseClient | Any,
    user_id: str,
) -> list[dict[str, Any]]:
    """
    Obtiene todas las campañas activas asociadas al usuario.
    """
    try:
        db = getattr(supabase, "db", supabase)
        response = (
            db
            .table("campaign_members")
            .select(
                """
                campaign_id,
                campaign_role,
                joined_at,
                campaigns (
                    campaign_name,
                    description,
                    tracking_format,
                    pricing_config,
                    platform_config,
                    is_active
                )
                """
            )
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )

        if not response.data:
            return []

        result = []

        for member in response.data:
            campaign = member.get("campaigns")

            if not campaign or not campaign.get("is_active", True):
                continue

            result.append({
                "campaign_id": member.get("campaign_id"),
                "campaign_name": campaign.get("campaign_name"),
                "campaign_role": member.get("campaign_role"),
                "tracking_format": campaign.get("tracking_format") or {},
                "pricing_config": campaign.get("pricing_config") or {},
                "platform_config": campaign.get("platform_config") or {},
            })

        return result

    except Exception as e:
        logger.warning(
            f"[WARN] Error obteniendo campañas "
            f"del usuario {user_id}: {e}"
        )
        return []

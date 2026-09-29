import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies.auth import get_current_user
from app.modules.agent.services.agent_context_service import AgentContextService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agent"])


def get_campaign_repository(request: Request):
    return request.app.state.campaign_repository


@router.get("/me")
async def get_current_agent(
    current_user: dict = Depends(get_current_user),
):
    """Retorna la información del agente autenticado."""
    return current_user


@router.get("/context")
async def get_agent_context(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el contexto activo del agente: campaña asignada,
    prompt contextual y configuración relevante.

    Este endpoint es la base de la integración con OCC.
    """
    try:
        repo = get_campaign_repository(request)
        service = AgentContextService(repo)
        context = await service.get_context_for_agent(current_user["id"])
        return context
    except Exception as e:
        logger.error(f"Error fetching agent context: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener el contexto del agente")


@router.get("/session")
async def get_agent_session(
    current_user: dict = Depends(get_current_user),
):
    """
    Valida y retorna la sesión activa del agente.

    [STUB] — Futuro punto de integración con OCC para
    detección automática de sesión y campaña activa.
    """
    return {
        "agent_id": current_user.get("id"),
        "status": "active",
        "occ_session": None,  # TODO: integrar con OCC
        "campaign_id": current_user.get("campaign_id"),
    }


@router.get("/campaign/{campaign_id}/members")
async def get_campaign_members(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Lista los miembros de una campaña (stub)."""
    pass


@router.get("/campaign/{campaign_id}/training-insights")
async def get_campaign_training_insights(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Insights de entrenamiento de la campaña (stub)."""
    pass


@router.get("/campaign/{campaign_id}/query-logs")
async def get_campaign_query_logs(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Logs de consultas de la campaña (stub)."""
    pass

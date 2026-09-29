"""
AgentContextService
===================
Servicio responsable de construir el contexto contextual del agente
a partir de su sesión y campaña asignada.

Este servicio es el núcleo del Asistente Virtual para Asesores.
Futuro punto de integración con OCC para detección automática de campaña.
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class AgentContextService:
    """
    Construye y retorna el contexto del agente activo.

    El contexto incluye:
    - Campaña asignada al agente
    - Prompt contextual de la campaña (para alimentar al LLM)
    - Configuración de la plataforma/operación activa

    Integración OCC (pendiente):
    - Detectar sesión activa del asesor en la plataforma OCC
    - Obtener automáticamente la campaña en curso
    - Refrescar el contexto en tiempo real durante la operación
    """

    def __init__(self, campaign_repository):
        self.campaign_repo = campaign_repository

    async def get_context_for_agent(self, agent_id: str) -> Dict[str, Any]:
        """
        Retorna el contexto completo del agente:
        campaña activa, prompt contextual y parámetros de operación.

        Args:
            agent_id: UUID del agente autenticado.

        Returns:
            Diccionario con el contexto del agente.
        """
        try:
            campaign = await self._resolve_agent_campaign(agent_id)

            if not campaign:
                logger.info(f"Agent {agent_id} has no active campaign assigned.")
                return {
                    "agent_id": agent_id,
                    "campaign": None,
                    "context_prompt": None,
                    "platform_config": None,
                    "status": "no_campaign",
                }

            return {
                "agent_id": agent_id,
                "campaign": {
                    "campaign_id": campaign.get("campaign_id"),
                    "campaign_name": campaign.get("campaign_name"),
                    "description": campaign.get("description"),
                    "is_active": campaign.get("is_active", True),
                },
                "context_prompt": campaign.get("context_prompt"),
                "platform_config": campaign.get("platform_config"),
                "tracking_format": campaign.get("tracking_format"),
                "status": "active",
            }

        except Exception as e:
            logger.error(f"Error building context for agent {agent_id}: {e}", exc_info=True)
            raise

    async def _resolve_agent_campaign(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Busca la campaña activa asignada al agente.

        [STUB] Actualmente consulta campaign_members.
        En el futuro: integrar con OCC para resolución en tiempo real.

        Args:
            agent_id: UUID del agente.

        Returns:
            Datos de la campaña activa o None si no tiene ninguna.
        """
        try:
            # Buscar en campaign_members la campaña activa del agente
            if hasattr(self.campaign_repo, "get_agent_active_campaign"):
                return await self.campaign_repo.get_agent_active_campaign(agent_id)

            # Fallback: retornar None hasta que el repo esté implementado
            logger.warning(
                f"get_agent_active_campaign not implemented in repo. "
                f"Agent {agent_id} context will be empty."
            )
            return None

        except Exception as e:
            logger.error(f"Error resolving campaign for agent {agent_id}: {e}")
            return None

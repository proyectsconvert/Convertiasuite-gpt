import logging
from typing import Optional
from fastapi import Request

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.domain.interfaces.rag_repository import IRagRepository
from app.services.documents.document_processing.document_manager import DocumentManager
from app.services.prompts.templates.prompt_templates import AGENT_MODE_PROMPTS

logger = logging.getLogger(__name__)


def get_llm_provider(request: Request) -> ILlmProvider:
    return request.app.state.llm_provider


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory


def get_document_manager(request: Request) -> DocumentManager:
    return request.app.state.document_manager


def get_intent_classifier(request: Request):
    return getattr(request.app.state, "intent_classifier", None)


def get_rag_repository(request: Request) -> IRagRepository | None:
    return getattr(request.app.state, "rag_repository", None)


def get_campaign_repository(request: Request):
    """
    Repositorio para consultar membresías de campaña (campaign_members)
    y registrar logs de queries de agente (agent_query_logs).
    """
    return getattr(request.app.state, "campaign_repository", None)


async def resolve_user_access_context(
    user_id: str,
    campaign_repository,
) -> dict:
    """
    Arma el contexto mínimo de acceso para el RAG a partir de los
    datos de perfil y campaña del usuario autenticado.
    """
    if campaign_repository is None:
        return {"user_id": user_id}

    try:
        return await campaign_repository.get_user_access_context(user_id)
    except Exception as e:
        logger.warning(f"[rag_access_context] error consultando acceso user={user_id}: {e}")
        return {"user_id": user_id}


async def resolve_agent_context(
    user_id: str,
    campaign_repository,
) -> Optional[dict]:
    if campaign_repository is None:
        return None

    try:
        membership = await campaign_repository.get_active_membership(user_id)
    except Exception as e:
        logger.error(f"[campaign_members] error consultando membresía user={user_id}: {e}")
        return None

    if not membership:
        return None

    return {
        "campaign_id": membership["campaign_id"],
        "campaign_role": membership.get("role", "agente"),
        "campaign_name": membership.get("campaign_name"),
        "campaign_data": membership.get("campaign_data", {}),
    }


def build_agent_system_context(agent_context: dict) -> str:
    base = AGENT_MODE_PROMPTS.get("default", "")

    campaign_block = (
        "\n## CONTEXTO DE CAMPAÑA\n\n"
        f"- Campaña activa: {agent_context.get('campaign_name') or agent_context['campaign_id']}\n"
        f"- Rol del agente: {agent_context['campaign_role']}\n"
    )

    extra_data = agent_context.get("campaign_data") or {}
    if extra_data:
        campaign_block += "\nDatos adicionales de campaña:\n"
        for key, value in extra_data.items():
            campaign_block += f"- {key}: {value}\n"

    return base + "\n" + campaign_block


async def classify_query_safely(intent_classifier, text: str) -> Optional[str]:
    if intent_classifier is None:
        return None
    try:
        return await intent_classifier.classify(text)
    except Exception as e:
        logger.warning(f"[agent_query_logs] fallo clasificando intención: {e}")
        return None


async def log_agent_query(
    campaign_repository,
    *,
    user_id: str,
    campaign_id: str,
    campaign_role: str,
    query_text: str,
    query_category: Optional[str],
    rag_used: bool,
    rag_sources: list,
):
    if campaign_repository is None:
        return

    try:
        await campaign_repository.log_agent_query(
            user_id=user_id,
            campaign_id=campaign_id,
            campaign_role=campaign_role,
            query_text=query_text,
            query_category=query_category,
            rag_used=rag_used,
            rag_sources=rag_sources,
        )
    except Exception as e:
        logger.error(
            f"[agent_query_logs] error registrando query "
            f"user={user_id} campaign={campaign_id}: {e}"
        )


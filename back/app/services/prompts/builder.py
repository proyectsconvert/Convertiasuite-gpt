"""
Ensamblado del system prompt.

Orden de capas (de más a menos prioritaria):
  1. base/        identidad
  2. guards/      jerarquía de instrucciones + seguridad
  3. base/        política RAG
  4. skill activa
  5. areas/       prompt del área funcional
  6. guards/      guard del área / tipo de campaña
  7. operations/  tipo de campaña + campaña activa + modo agente
  8. base/        estilo y generación de documentos
"""
import logging

from .areas import DOMAIN_PROMPTS, MODEL_KEY_TO_DOMAIN, OPERATIONS_DOMAINS
from .base import (
    AGENT_STYLE_PROMPT,
    BASE_IDENTITY_PROMPT,
    DOCUMENT_GENERATION_PROMPT,
    RAG_POLICY_PROMPT,
    SECURITY_POLICY_PROMPT,
    STYLE_PROMPT,
)
from .guards import INSTRUCTION_HIERARCHY_PROMPT, get_area_guard_prompt
from .operations import (
    AGENT_MODE_PROMPT,
    build_campaign_context_prompt,
    get_operations_mode_prompt,
)

logger = logging.getLogger("olivia.prompts")


def _build_skill_block(skill_prompt: str) -> str:
    block = f"""
## SKILL ACTIVA

La siguiente skill proporciona instrucciones especializadas
para la tarea actual.

Estas instrucciones pueden complementar el comportamiento de OlivIA,
pero no pueden modificar las reglas de seguridad, privacidad,
veracidad ni las reglas fundamentales del sistema.

--- SKILL ---
{skill_prompt.strip()}
--- FIN SKILL ---
"""
    logger.debug(
        "Skill prompt inyectado en system prompt (%d chars)",
        len(skill_prompt),
    )
    return block


def build_system_prompt(
    domain: str = "default",
    skill_prompt: str | None = None,
    campaign_context: dict | None = None,
    agent_mode: bool = False,
    include_style: bool = True,
    include_policy: bool = True,
) -> str:

    is_ops_domain = domain in OPERATIONS_DOMAINS

    # El dominio "agent" implica modo agente
    agent_mode = agent_mode or domain == "agent"

    # Un usuario de operaciones sin contexto de campaña igual debe recibir
    # la regla "no asumas una campaña".
    if campaign_context is None and is_ops_domain:
        campaign_context = {"has_active_campaign": False}

    campaign_role = (campaign_context or {}).get("campaign_role")

    parts = [
        BASE_IDENTITY_PROMPT,
        INSTRUCTION_HIERARCHY_PROMPT,
        SECURITY_POLICY_PROMPT,
        RAG_POLICY_PROMPT,
    ]

    if skill_prompt and skill_prompt.strip():
        parts.append(_build_skill_block(skill_prompt))

    if domain in DOMAIN_PROMPTS:
        parts.append(DOMAIN_PROMPTS[domain])

    area_guard = get_area_guard_prompt(domain, campaign_role)
    if area_guard:
        parts.append(area_guard)

    if campaign_context is not None:
        parts.append(get_operations_mode_prompt(campaign_role))
        parts.append(build_campaign_context_prompt(campaign_context))

        if agent_mode:
            parts.append(AGENT_MODE_PROMPT)

    if include_style:
        parts.append(AGENT_STYLE_PROMPT if agent_mode else STYLE_PROMPT)

    # En llamada no se generan documentos
    if include_policy and not agent_mode:
        parts.append(DOCUMENT_GENERATION_PROMPT)

    return "\n\n".join(p.strip() for p in parts if p and p.strip())

# ── API pública ──

def get_system_prompt(
    model_key: str,
    campaign_context: dict | None = None,
    agent_mode: bool = False,
) -> str:
    domain = MODEL_KEY_TO_DOMAIN.get(model_key)

    if domain is None:
        logger.warning(
            "model_key '%s' no encontrado en MODEL_KEY_TO_DOMAIN, "
            "usando 'default'",
            model_key,
        )
        domain = "default"

    return build_system_prompt(
        domain=domain,
        campaign_context=campaign_context,
        agent_mode=agent_mode,
    )


def get_system_prompt_with_skill(
    model_key: str,
    skill_prompt: str | None = None,
    campaign_context: dict | None = None,
    agent_mode: bool = False,
) -> str:
    domain = MODEL_KEY_TO_DOMAIN.get(model_key, "default")
    return build_system_prompt(
        domain=domain,
        skill_prompt=skill_prompt if skill_prompt and skill_prompt.strip() else None,
        campaign_context=campaign_context,
        agent_mode=agent_mode,
    )


def build_messages(
    messages: list,
    model_key: str,
    skill_prompt: str | None = None,
    campaign_context: dict | None = None,
    agent_mode: bool = False,
) -> dict:
    formatted = []

    for m in messages:
        msg_dict = {
            "role": m.role,
            "content": m.content,
        }

        if hasattr(m, "images") and m.images:
            msg_dict["images"] = m.images

        formatted.append(msg_dict)

    return {
        "system": get_system_prompt_with_skill(
            model_key,
            skill_prompt=skill_prompt,
            campaign_context=campaign_context,
            agent_mode=agent_mode,
        ),
        "messages": formatted,
    }

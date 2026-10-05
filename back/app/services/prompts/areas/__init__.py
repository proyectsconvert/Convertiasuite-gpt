"""
Prompts por área funcional (incluida Operaciones).

Para agregar un área: crear areas/<nombre>.py con PROMPT, registrarla en
DOMAIN_PROMPTS y mapear su model_key en MODEL_KEY_TO_DOMAIN.
"""
from . import dev, landing, bi, marketing, it, rh, design, vision, reasoning, medical, analysis, operations, agent, back_office, quality_analyst, kam

DOMAIN_PROMPTS = {
    "dev": dev.PROMPT,
    "landing": landing.PROMPT,
    "bi": bi.PROMPT,
    "marketing": marketing.PROMPT,
    "it": it.PROMPT,
    "rh": rh.PROMPT,
    "design": design.PROMPT,
    "vision": vision.PROMPT,
    "reasoning": reasoning.PROMPT,
    "medical": medical.PROMPT,
    "analysis": analysis.PROMPT,
    "operations": operations.PROMPT,
    "agent": agent.PROMPT,
    "back_office": back_office.PROMPT,
    "quality_analyst": quality_analyst.PROMPT,
    "kam": kam.PROMPT,
}

# Áreas que implican contexto operativo (campaña, agente, etc.)
OPERATIONS_DOMAINS = frozenset({'back_office', 'operations', 'quality_analyst', 'agent', 'kam'})

# model_key -> dominio (incluye los roles que produce role_mapper)
MODEL_KEY_TO_DOMAIN = {
    "default": "default",
    "code": "dev",
    "dev": "dev",
    "landing": "landing",
    "html": "landing",
    "bi": "bi",
    "marketing": "marketing",
    "it": "it",
    "rh": "rh",
    "design": "design",
    "vision": "vision",
    "reasoning": "reasoning",
    "medical": "medical",
    "analysis": "analysis",
    "ocr": "vision",
    "operations": "operations",
    "agent": "agent",
    "back_office": "back_office",
    "quality_analyst": "quality_analyst",
    "kam": "kam",
    "gemma-small": "default",
    "gemma-medium": "default",
}

"""Prompt específico de Operaciones (tipo de campaña, modo agente, campaña activa)."""
from .agent_mode import AGENT_MODE_PROMPT
from .campaign_context import build_campaign_context_prompt
from .campaign_types import (
    COBRANZA_OPERATIONS_PROMPT,
    OPERATIONS_PROMPT,
    VENTAS_OPERATIONS_PROMPT,
    get_operations_mode_prompt,
)

__all__ = [
    "OPERATIONS_PROMPT", "VENTAS_OPERATIONS_PROMPT", "COBRANZA_OPERATIONS_PROMPT",
    "AGENT_MODE_PROMPT", "get_operations_mode_prompt", "build_campaign_context_prompt",
]

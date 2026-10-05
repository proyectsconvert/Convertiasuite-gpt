"""
Guards de OlivIA en tres capas:
  - prompt_guards: reglas dentro del system prompt
  - input_guard:   mensaje del usuario + contenido no confiable (RAG, archivos, configs)
  - output_guard:  respuesta del modelo
"""
from .common import GuardResult
from .input_guard import check_user_input, sanitize_untrusted_text, wrap_untrusted
from .output_guard import check_output, find_unsupported_figures, mask_card_numbers
from .prompt_guards import (
    AREA_GUARD_PROMPTS,
    INSTRUCTION_HIERARCHY_PROMPT,
    get_area_guard_prompt,
)

__all__ = [
    "GuardResult", "check_user_input", "sanitize_untrusted_text", "wrap_untrusted",
    "check_output", "find_unsupported_figures", "mask_card_numbers",
    "AREA_GUARD_PROMPTS", "INSTRUCTION_HIERARCHY_PROMPT", "get_area_guard_prompt",
]

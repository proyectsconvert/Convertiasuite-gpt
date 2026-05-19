import unicodedata
import re
from app.security.exceptions import PolicyViolationException

MAX_INPUT_LENGTH = 12000
MAX_HISTORY_MESSAGES = 10
MAX_CONTEXT_CHARS = 12000

REFUSAL_FALLBACK = "Lo siento, no puedo procesar esa solicitud"

ZERO_WIDTH_CHARS = [
    "\u200b",  # Zero Width Space
    "\u200c",  # Zero Width Non-Joiner
    "\u200d",  # Zero Width Joiner
    "\ufeff",  # Zero Width No-Break Space
]


def normalize_text(text: str) -> str:
    """Normaliza texto sin cambiar semántica."""
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)

    for zw in ZERO_WIDTH_CHARS:
        text = text.replace(zw, "")

    text = text.lower()
    text = re.sub(r"\s+", " ", text)

    return text


def _contains_control_chars(text: str) -> bool:
    for c in text:
        if ord(c) < 32 and c not in "\t\n\r":
            return True
    return False


def sanitize_input(text: str) -> str:
    """
    Sanitiza y valida input del usuario.
    No revela qué patrón fue detectado.
    """
    if not text:
        raise PolicyViolationException("Input no puede estar vacío")

    if not isinstance(text, str):
        raise PolicyViolationException("Formato de entrada no válido")

    normalized = unicodedata.normalize("NFKC", text)

    for zw in ZERO_WIDTH_CHARS:
        normalized = normalized.replace(zw, "")

    normalized = normalized.strip()

    if len(normalized) == 0:
        raise PolicyViolationException("Input no puede estar vacío")

    if len(normalized) > MAX_INPUT_LENGTH:
        raise PolicyViolationException(f"Entrada excede límite permitido")

    if _contains_control_chars(normalized):
        raise PolicyViolationException("Entrada contiene caracteres no permitidos")

    return normalized


def _is_refusal_message(msg) -> bool:
    content = (
        msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
    )
    return REFUSAL_FALLBACK in content


def _truncate_history(history: list, max_messages: int = MAX_HISTORY_MESSAGES) -> list:
    if len(history) <= max_messages:
        return history

    filtered = [msg for msg in history if not _is_refusal_message(msg)]

    while len(filtered) > max_messages:
        if (
            len(filtered) > 2
            and filtered[0].get("role") == "user"
            and len(filtered) > 2
        ):
            filtered.pop(0)
        elif len(filtered) > 2 and filtered[0].get("role") == "assistant":
            filtered.pop(0)
        else:
            break

    return filtered


def validate_history_length(history: list) -> bool:
    if not history:
        return True

    if len(history) > MAX_HISTORY_MESSAGES:
        raise PolicyViolationException(f"Historial excede límite permitido")

    total_chars = sum(len(msg.get("content", "")) for msg in history)

    if total_chars > MAX_CONTEXT_CHARS:
        raise PolicyViolationException(f"Contexto excede límite permitido")
    return True

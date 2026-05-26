import unicodedata
import re
from app.security.exceptions import PolicyViolationException
from app.security.unicode_utils import normalize_unicode, ZERO_WIDTH_CHARS

MAX_INPUT_LENGTH = 12000
MAX_HISTORY_MESSAGES = 10
MAX_CONTEXT_CHARS = 12000

REFUSAL_FALLBACK = "Lo siento, no puedo procesar esa solicitud"

# NOTA: ZERO_WIDTH_CHARS importado desde unicode_utils para evitar duplicación


def _contains_control_chars(text: str) -> bool:
    for c in text:
        if ord(c) < 32 and c not in "\t\n\r":
            return True
    return False


def sanitize_input(text: str) -> str:
    if not text:
        raise PolicyViolationException("Input no puede estar vacío")

    if not isinstance(text, str):
        raise PolicyViolationException("Formato de entrada no válido")

    normalized = normalize_unicode(text)

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


def truncate_history_by_tokens(history: list, max_tokens: int = 4000) -> list:
    """
    Truncates message history based on an approximate token budget (estimated by character count).
    Keeps the most recent messages.
    """
    if not history:
        return []
    # 1 token is roughly 4 characters
    max_chars = max_tokens * 4
    total_chars = 0
    kept_messages = []

    for msg in reversed(history):
        content = msg.content if hasattr(msg, "content") else msg.get("content", "")
        msg_len = len(content) if content else 0
        if total_chars + msg_len > max_chars:
            if len(kept_messages) >= 1:
                break
        total_chars += msg_len
        kept_messages.append(msg)

    return list(reversed(kept_messages))

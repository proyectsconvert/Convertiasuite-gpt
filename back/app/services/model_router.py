from typing import Optional
import re

from app.core.model_config import (
    ALLOWED_MODELS,
    DEFAULT_MODEL_KEY,
    MODEL_REGISTRY,
    ROUTING_POLICY,
    get_model_config,
)

from app.core.keywords_config import GENERIC_CHAT_TERMS, KEYWORDS_LANDING, matches_any

_GENERIC_CHAT_PATTERNS = [f"^{re.escape(k)}[\\s\\?\\!]*$" for k in GENERIC_CHAT_TERMS]

_LANDING_PHRASES = KEYWORDS_LANDING


def build_routing_context(message: str, history: list | None = None) -> str:
    history = history or []
    recent_text_parts = []

    for item in history[-6:]:
        role = (
            item.get("role") if isinstance(item, dict) else getattr(item, "role", None)
        )
        content = (
            item.get("content")
            if isinstance(item, dict)
            else getattr(item, "content", "")
        )
        if role and content:
            recent_text_parts.append(f"{role}: {content}")

    recent_text = "\n".join(recent_text_parts)
    if recent_text:
        return f"{message}\n\n[HISTORY_CONTEXT]\n{recent_text}"
    return message


def _strip_history_context(message: str) -> str:
    if not message:
        return ""

    split_marker = "\n\n[HISTORY_CONTEXT]\n"
    return message.split(split_marker, 1)[0].strip()


def _strip_code_blocks(message: str) -> str:
    if not message:
        return ""

    # Remove fenced code blocks and inline code spans from routing decisions.
    message = re.sub(r"```[\s\S]*?```", "", message)
    message = re.sub(r"`[^`]*`", "", message)
    return message.strip()


def _prepare_routing_text(message: str) -> str:
    return _strip_code_blocks(_strip_history_context(message)).lower().strip()


def _is_generic_chat(message: str) -> bool:
    msg_lower = _prepare_routing_text(message)
    if not msg_lower:
        return False

    return any(re.fullmatch(pattern, msg_lower) for pattern in _GENERIC_CHAT_PATTERNS)


async def route_model(
    message: str,
    user_role: str = None,
    attachment_type: Optional[str] = None,
    intent_classifier=None,
    history: list | None = None,
) -> str:
    if attachment_type:
        normalized_type = attachment_type.lower()
        route = ROUTING_POLICY["attachment_type"].get(normalized_type)
        if route and route in MODEL_REGISTRY:
            return route

    if user_role and user_role != DEFAULT_MODEL_KEY:
        if user_role in ALLOWED_MODELS:
            return user_role

    if _is_generic_chat(message):
        return DEFAULT_MODEL_KEY

    if intent_classifier is not None:
        routing_text = _prepare_routing_text(message)
        domain = await intent_classifier.classify(routing_text)
        if domain and domain in MODEL_REGISTRY:
            return domain

    routing_text = _prepare_routing_text(message)
    if matches_any(routing_text, _LANDING_PHRASES):
        return "landing"

    from app.core.keywords_config import (
        KEYWORDS_VISION,
        KEYWORDS_ANALYSIS,
        KEYWORDS_CODE,
        KEYWORDS_LANDING,
        KEYWORDS_REASONING,
        KEYWORDS_OCR,
        KEYWORDS_MEDICAL,
    )

    if matches_any(routing_text, KEYWORDS_VISION):
        return "vision"
    if matches_any(routing_text, KEYWORDS_ANALYSIS):
        return "analysis"
    if matches_any(routing_text, KEYWORDS_CODE):
        return "code"
    if matches_any(routing_text, KEYWORDS_REASONING):
        return "reasoning"
    if matches_any(routing_text, KEYWORDS_OCR):
        return "ocr"
    if matches_any(routing_text, KEYWORDS_MEDICAL):
        return "medical"
    if matches_any(routing_text, KEYWORDS_LANDING):
        return "landing"

    # Fallback: Si el mensaje actual es muy corto (ej: "mm", "si", "continua") y no clasifica,
    # intentamos buscar la intención en el último mensaje del usuario del historial.
    if len(routing_text) < 15 and history:
        for item in reversed(history):
            role = item.get("role") if isinstance(item, dict) else getattr(item, "role", None)
            content = item.get("content") if isinstance(item, dict) else getattr(item, "content", "")
            if role == "user" and content:
                content_clean = _prepare_routing_text(content)
                if matches_any(content_clean, KEYWORDS_LANDING):
                    return "landing"
                if matches_any(content_clean, KEYWORDS_VISION):
                    return "vision"
                if matches_any(content_clean, KEYWORDS_ANALYSIS):
                    return "analysis"
                if matches_any(content_clean, KEYWORDS_CODE):
                    return "code"
                if matches_any(content_clean, KEYWORDS_REASONING):
                    return "reasoning"
                if matches_any(content_clean, KEYWORDS_OCR):
                    return "ocr"
                if matches_any(content_clean, KEYWORDS_MEDICAL):
                    return "medical"

    return DEFAULT_MODEL_KEY


def get_model_info(model_key: str) -> dict:
    models = get_model_config()
    return models.get(model_key, models[DEFAULT_MODEL_KEY])

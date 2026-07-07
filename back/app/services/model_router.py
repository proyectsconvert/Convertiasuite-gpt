from typing import Optional
import re

from app.core.model_config import (
    ALLOWED_MODELS,
    DEFAULT_MODEL_KEY,
    MODEL_REGISTRY,
    ROUTING_POLICY,
    get_model_config,
)

_GENERIC_CHAT_PATTERNS = [
    r"^hola[\s\?\!]*$",
    r"^buenos d[ií]as[\s\?\!]*$",
    r"^buenas tardes[\s\?\!]*$",
    r"^buenas noches[\s\?\!]*$",
    r"^qué tal[\s\?\!]*$",
    r"^que tal[\s\?\!]*$",
    r"^cómo estás[\s\?\!]*$",
    r"^como estas[\s\?\!]*$",
    r"^quién eres[\s\?\!]*$",
    r"^quien eres[\s\?\!]*$",
    r"^qué haces[\s\?\!]*$",
    r"^que haces[\s\?\!]*$",
    r"^cómo te llamas[\s\?\!]*$",
    r"^como te llamas[\s\?\!]*$",
    r"^tu nombre[\s\?\!]*$",
    r"^quién soy[\s\?\!]*$",
    r"^quien soy[\s\?\!]*$",
    r"^gracias[\s\?\!]*$",
    r"^muchas gracias[\s\?\!]*$",
]

_LANDING_PHRASES = [
    "landing page",
    "landing-page",
    "sitio web",
    "maquetación",
    "diseña una página web",
    "crea un sitio web",
    "diseña una landing",
    "página de destino",
    "página de aterrizaje",
]


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
    if any(k in routing_text for k in _LANDING_PHRASES):
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

    if any(k in routing_text for k in KEYWORDS_VISION):
        return "vision"
    if any(k in routing_text for k in KEYWORDS_ANALYSIS):
        return "analysis"
    if any(k in routing_text for k in KEYWORDS_CODE):
        return "code"
    if any(k in routing_text for k in KEYWORDS_REASONING):
        return "reasoning"
    if any(k in routing_text for k in KEYWORDS_OCR):
        return "ocr"
    if any(k in routing_text for k in KEYWORDS_MEDICAL):
        return "medical"
    if any(k in routing_text for k in KEYWORDS_LANDING):
        return "landing"

    return DEFAULT_MODEL_KEY


def get_model_info(model_key: str) -> dict:
    models = get_model_config()
    return models.get(model_key, models[DEFAULT_MODEL_KEY])

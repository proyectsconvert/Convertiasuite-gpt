from typing import Optional

from app.core.model_config import (
    ALLOWED_MODELS,
    DEFAULT_MODEL_KEY,
    MODEL_REGISTRY,
    ROUTING_POLICY,
    get_model_config,
)
from app.core.keywords_config import (
    KEYWORDS_VISION,
    KEYWORDS_ANALYSIS,
    KEYWORDS_CODE,
    KEYWORDS_REASONING,
    KEYWORDS_OCR,
    KEYWORDS_MEDICAL,
)


def route_model(
    message: str,
    user_role: str = None,
    attachment_type: Optional[str] = None,
) -> str:
    if attachment_type:
        normalized_type = attachment_type.lower()
        route = ROUTING_POLICY["attachment_type"].get(normalized_type)
        if route and route in MODEL_REGISTRY:
            return route

    if user_role and user_role != DEFAULT_MODEL_KEY:
        if user_role in ALLOWED_MODELS:
            return user_role

    msg_lower = (message or "").lower()

    if any(k in msg_lower for k in KEYWORDS_VISION):
        return "vision"
    if any(k in msg_lower for k in KEYWORDS_ANALYSIS):
        return "analysis"
    if any(k in msg_lower for k in KEYWORDS_CODE):
        return "code"
    if any(k in msg_lower for k in KEYWORDS_REASONING):
        return "reasoning"
    if any(k in msg_lower for k in KEYWORDS_OCR):
        return "ocr"
    if any(k in msg_lower for k in KEYWORDS_MEDICAL):
        return "medical"

    return DEFAULT_MODEL_KEY


def get_model_info(model_key: str) -> dict:
    models = get_model_config()
    return models.get(model_key, models[DEFAULT_MODEL_KEY])

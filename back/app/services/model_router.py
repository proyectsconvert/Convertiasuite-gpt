from app.core.model_config import MODELS, DEFAULT_MODEL_KEY, ALLOWED_MODELS
from app.core.keywords_config import (
    KEYWORDS_VISION, KEYWORDS_ANALYSIS, KEYWORDS_CODE,
    KEYWORDS_REASONING, KEYWORDS_OCR, KEYWORDS_MEDICAL
)


def route_model(message: str, user_role: str = None, has_attachment: bool = False) -> str:
    if has_attachment:
        return "vision"

    if user_role and user_role != "default":
        if user_role in ALLOWED_MODELS:
            return user_role

    msg_lower = message.lower()

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
    return MODELS.get(model_key, MODELS[DEFAULT_MODEL_KEY])
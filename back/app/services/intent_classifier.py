from app.schemas.chat import UserRole, ChatRequest
from app.core.keywords_config import (
    KEYWORDS_VISION, KEYWORDS_ANALYSIS, KEYWORDS_CODE,
    KEYWORDS_REASONING, KEYWORDS_OCR, KEYWORDS_MEDICAL
)
from app.security.risk_scorer import risk_scorer


async def classify_intent(request: ChatRequest) -> UserRole:
    message = request.message.lower()

    if request.has_attachment:
        if getattr(request, "extracted_context", None):
            return UserRole.analysis  
        
        return UserRole.vision

    if request.user_role != UserRole.default:
        return request.user_role

    risk = risk_scorer.score(request.message)
    if risk.should_block:
        return UserRole.default

    if any(k in message for k in KEYWORDS_VISION):
        return UserRole.vision

    if any(k in message for k in KEYWORDS_ANALYSIS):
        return UserRole.analysis

    if any(k in message for k in KEYWORDS_CODE):
        return UserRole.code

    if any(k in message for k in KEYWORDS_REASONING):
        return UserRole.reasoning

    if any(k in message for k in KEYWORDS_OCR):
        return UserRole.ocr

    if any(k in message for k in KEYWORDS_MEDICAL):
        return UserRole.medical

    return UserRole.default
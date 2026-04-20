from app.models.schemas import UserRole, ChatRequest
from app.core.config import get_settings

settings = get_settings()

KEYWORDS_VISION = ["imagen", "foto", "fotografía", "analiza esta", "qué ves", "describe la imagen"]
KEYWORDS_ANALYSIS = ["investiga", "informe", "análisis profundo", "presenta", "reporte", "ppt"]
KEYWORDS_CODE = ["código", "código", "función", "bug", "error", "script", "programa", "clase"]

def classify_intent(request: ChatRequest) -> UserRole:
    message = request.message.lower()

    if request.has_attachment:
        return UserRole.vision

    if request.user_role != UserRole.default:
        return request.user_role

    if any(k in message for k in KEYWORDS_VISION):
        return UserRole.vision

    if any(k in message for k in KEYWORDS_ANALYSIS):
        return UserRole.analysis

    if any(k in message for k in KEYWORDS_CODE):
        return UserRole.code

    return UserRole.default
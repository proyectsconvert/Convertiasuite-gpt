from app.schemas.chat import UserRole, ChatRequest
from app.core.config import get_settings
from app.core.keywords_config import (
    KEYWORDS_VISION, KEYWORDS_ANALYSIS, KEYWORDS_CODE, 
    KEYWORDS_REASONING, KEYWORDS_OCR, KEYWORDS_MEDICAL
)
from app.infra.clients.ollama_client import OllamaClient

settings = get_settings()
ollama_client = OllamaClient()


async def classify_with_model(message: str) -> UserRole:
    prompt = f"""Clasifica este mensaje en una sola palabra.
Opciones: default, code, vision, analysis, reasoning, ocr, medical, gemma-small

Mensaje: "{message}"
Responde solo con la palabra, sin explicación."""

    response = await ollama_client.generate(
        model="gemma4-e2b:latest",
        prompt=prompt
    )

    role = response.strip().lower()
    try:
        return UserRole(role)
    except ValueError:
        return UserRole.default


async def classify_intent(request: ChatRequest) -> UserRole:
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

    if any(k in message for k in KEYWORDS_REASONING):
        return UserRole.reasoning

    if any(k in message for k in KEYWORDS_OCR):
        return UserRole.ocr

    if any(k in message for k in KEYWORDS_MEDICAL):
        return UserRole.medical

    return await classify_with_model(request.message)
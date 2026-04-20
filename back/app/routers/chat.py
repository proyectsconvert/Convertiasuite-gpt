from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.intent_classifier import classify_intent
from app.services.ollama_client import generate_response
from app.core.config import get_settings
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

settings = get_settings()

def validate_model(model: str):
    if model not in settings.model_mapping.values():
        raise ValueError(f"Modelo no permitido: {model}")

@router.post("/", response_model=ChatResponse)
async def send_message(request: ChatRequest):

    # 1. clasificar intención (NO es modelo)
    intent = classify_intent(request)

    # 2. mapear a modelo real
    model = settings.model_mapping.get(intent, settings.default_model)

    # 3. validar modelo
    validate_model(model)

    try:
        response = await generate_response(
            prompt=request.message,
            model=model
        )
    except Exception as e:
        response = f"Error interno: {str(e)}"

    return ChatResponse(
        response=response,
        model_used=model,
        session_id=request.session_id or str(uuid.uuid4())
    )
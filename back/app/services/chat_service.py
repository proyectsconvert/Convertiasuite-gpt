from app.security.input_sanitizer import sanitize_input
from app.security.output_guard import sanitize_output
from app.services.intent_classifier import classify_intent
from app.services.ollama_client import generate_response
from app.core.config import get_settings
import asyncio

settings = get_settings()

async def process_chat(request):

    clean_input = sanitize_input(request.message)

    if not clean_input:
        raise ValueError("Input vacío")

    intent = classify_intent(clean_input)

    model = settings.model_mapping.get(intent, settings.default_model)

    if model not in settings.allowed_models:
        raise Exception("Modelo no permitido")

    try:
        raw = await asyncio.wait_for(
            generate_response(prompt=clean_input, model=model),
            timeout=15
        )
    except asyncio.TimeoutError:
        return "El modelo tardó demasiado en responder", model

    safe_output = sanitize_output(raw)

    print({
        "event": "chat_execution",
        "model": model,
        "intent": intent,
        "input_len": len(clean_input)
    })

    return safe_output, model
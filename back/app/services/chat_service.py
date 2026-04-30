import uuid
from datetime import datetime
from app.security.input_sanitizer import sanitize_input
from app.security.output_guard import sanitize_output
from app.services.model_router import route_model
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.core.model_config import MODELS
from app.domain.entities.message import Message
from app.services.prompts.prompt_templates import build_prompt

async def _persist_conversation(memory_repo: IMemoryRepository, session_id: str, messages: list):
    await memory_repo.save_messages(session_id, [m.to_dict() for m in messages])

async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
):
    #Sanitización
    clean_input = sanitize_input(request.message)
    if not clean_input:
        raise ValueError("Input vacío")

    #Enrutamiento
    model_key = route_model(
        message=clean_input,
        user_role=request.user_role,
        has_attachment=request.has_attachment,
    )

    session_id = request.session_id or str(uuid.uuid4())

    #Cargar historial
    history = await memory_repo.get_messages(session_id) or []
    messages = [Message.from_dict(m) if isinstance(m, dict) else m for m in history]

    messages.append(Message(
        id=str(uuid.uuid4()),
        role="user",
        content=clean_input,
        timestamp=datetime.now(),
    ))

    #Generar Stream con Fallback de Seguridad
    stream = llm_provider.generate_stream(messages, model_key)

    async def wrapped_stream():
        full_response = ""
        has_content = False
        SECURITY_FALLBACK = "Lo siento, no puedo procesar esa solicitud por razones de seguridad y políticas de Convertia."

        async for chunk in stream:
            safe_chunk = sanitize_output(chunk)
            if safe_chunk:
                has_content = True
                full_response += safe_chunk
                yield safe_chunk

                # Persistencia periódica
                if len(full_response) % 200 == 0:
                    await _persist_conversation(memory_repo, session_id, messages)

        # Si el modelo se quedó mudo por el bloqueo de seguridad
        if not has_content or not full_response.strip():
            full_response = SECURITY_FALLBACK
            yield SECURITY_FALLBACK

        # 6. Guardar mensaje final del asistente
        messages.append(Message(
            id=str(uuid.uuid4()),
            role="assistant",
            content=full_response,
            timestamp=datetime.now(),
        ))
        await _persist_conversation(memory_repo, session_id, messages)

    return wrapped_stream(), MODELS[model_key]["model"], session_id

#Funciones de gestión de sesiones

async def get_sessions(user_id: str, memory_repo: IMemoryRepository):
    return await memory_repo.get_session_list(user_id)

async def create_session(user_id: str, title: str, memory_repo: IMemoryRepository):
    return await memory_repo.create_session(user_id, title)

async def delete_session(user_id: str, session_id: str, memory_repo: IMemoryRepository):
    await memory_repo.delete_session(user_id, session_id)
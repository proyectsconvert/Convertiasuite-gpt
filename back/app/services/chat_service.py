import uuid
import logging
from datetime import datetime
from app.security.input_sanitizer import sanitize_input
from app.security.output_guard import sanitize_output
from app.services.model_router import route_model
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.core.model_config import MODELS
from app.domain.entities.message import Message
from app.services.prompts.prompt_templates import build_prompt

logger = logging.getLogger(__name__)

async def _persist_conversation(memory_repo: IMemoryRepository, session_id: str, messages: list):
    await memory_repo.save_messages(session_id, [m.to_dict() for m in messages])

async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
):
    # Sanitización con try/catch
    try:
        clean_input = sanitize_input(request.message)
        if not clean_input:
            raise ValueError("Input vacío o filtrado por seguridad")
    except Exception as e:
        logger.warning(f"Error en sanitización: {e}")
        raise ValueError(f"Error al procesar entrada: {str(e)}")

    # Enrutamiento
    model_key = route_model(
        message=clean_input,
        user_role=request.user_role,
        has_attachment=request.has_attachment,
    )

    session_id = request.session_id or str(uuid.uuid4())

    # Cargar historial
    history = await memory_repo.get_messages(session_id) or []
    messages = [Message.from_dict(m) if isinstance(m, dict) else m for m in history]

    messages.append(Message(
        id=str(uuid.uuid4()),
        role="user",
        content=clean_input,
        timestamp=datetime.now(),
    ))

    # Generar Stream con Fallback de Seguridad
    stream = llm_provider.generate_stream(messages, model_key)

    async def wrapped_stream():
        full_response = ""
        emitted = False  # Flag para detectar si hubo contenido real
        SECURITY_FALLBACK = "Lo siento, no puedo procesar esa solicitud por razones de seguridad y políticas de Convertia."
        BLOCKED_KEYWORDS = ["blocked", "not allowed", "forbidden", "cannot", "unable to", "error", "failed"]

        async for chunk in stream:
            chunk_lower = chunk.lower() if chunk else ""
            is_blocked = any(keyword in chunk_lower for keyword in BLOCKED_KEYWORDS)
            
            safe_chunk = sanitize_output(chunk)
            if safe_chunk and not is_blocked:
                emitted = True
                full_response += safe_chunk
                yield safe_chunk

                # Persistencia periódica
                if len(full_response) % 200 == 0:
                    await _persist_conversation(memory_repo, session_id, messages)

        final_response = full_response.strip()
        
        if not emitted or not final_response:
            # Si no hubo contenido emitido o está vacío, usar fallback
            logger.warning(f"Stream vacío o bloqueado para session {session_id}")
            final_response = SECURITY_FALLBACK
            yield SECURITY_FALLBACK
        elif any(keyword in final_response.lower() for keyword in BLOCKED_KEYWORDS):
            # Si el contenido contiene palabras bloqueadas, usar fallback
            logger.warning(f"Contenido bloqueado detectado en session {session_id}")
            final_response = SECURITY_FALLBACK
            yield SECURITY_FALLBACK

        messages.append(Message(
            id=str(uuid.uuid4()),
            role="assistant",
            content=final_response,
            timestamp=datetime.now(),
        ))
        await _persist_conversation(memory_repo, session_id, messages)

    return wrapped_stream(), MODELS[model_key]["model"], session_id


async def get_sessions(user_id: str, memory_repo: IMemoryRepository):
    return await memory_repo.get_session_list(user_id)

async def create_session(user_id: str, title: str, memory_repo: IMemoryRepository):
    return await memory_repo.create_session(user_id, title)

async def delete_session(user_id: str, session_id: str, memory_repo: IMemoryRepository):
    await memory_repo.delete_session(user_id, session_id)
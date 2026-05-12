import uuid
import logging
import time
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


async def _persist_conversation(
    memory_repo: IMemoryRepository,
    session_id: str,
    messages: list
):
    await memory_repo.save_messages(
        session_id,
        [m.to_dict() for m in messages]
    )


async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
):
    try:
        clean_input = sanitize_input(request.message)

        if not clean_input:
            raise ValueError("Input vacío o filtrado por seguridad")

    except Exception as e:
        logger.warning(f"Error en sanitización: {e}")

        raise ValueError(
            f"Error al procesar entrada: {str(e)}"
        )

    model_key = route_model(
        message=clean_input,
        user_role=request.user_role,
        has_attachment=request.has_attachment,
    )

    model_name = MODELS[model_key]["model"]
    
    logger.info(f"Model Key: {model_key} | User Role: {request.user_role} | Model Name: {model_name}")

    session_id = request.session_id or str(uuid.uuid4())


    history = await memory_repo.get_messages(session_id) or []

    messages = [
        Message.from_dict(m) if isinstance(m, dict) else m
        for m in history
    ]

    messages.append(
        Message(
            id=str(uuid.uuid4()),
            role="user",
            content=clean_input,
            timestamp=datetime.now(),
        )
    )

    
    request_start = time.perf_counter()

    stream = llm_provider.generate_stream(
        messages,
        model_key
    )

    async def wrapped_stream():

        full_response = ""

        emitted = False
        first_token_sent = False

        SECURITY_FALLBACK = (
            "Lo siento, no puedo procesar esa solicitud "
            "por razones de seguridad y políticas de Convertia."
        )

        BLOCKED_KEYWORDS = [
            "blocked",
            "not allowed",
            "forbidden",
            "cannot",
            "unable to",
            "error",
            "failed"
        ]

        try:

            async for chunk in stream:

                
                if chunk and not first_token_sent:

                    ttft = time.perf_counter() - request_start

                    logger.info(
                        f"TTFT "
                        f"model={model_name} "
                        f"session={session_id} "
                        f"time={ttft:.3f}s"
                    )

                    first_token_sent = True

                
                chunk_lower = chunk.lower() if chunk else ""

                is_blocked = any(
                    keyword in chunk_lower
                    for keyword in BLOCKED_KEYWORDS
                )

                safe_chunk = sanitize_output(chunk)

                
                if safe_chunk and not is_blocked:

                    emitted = True

                    full_response += safe_chunk

                    yield safe_chunk

                
                    if len(full_response) % 200 == 0:

                        await _persist_conversation(
                            memory_repo,
                            session_id,
                            messages
                        )

        except Exception as e:

            logger.exception(
                f"Streaming error "
                f"model={model_name} "
                f"session={session_id} "
                f"error={str(e)}"
            )

            yield SECURITY_FALLBACK

            return

        final_response = full_response.strip()

        if not emitted or not final_response:

            logger.warning(
                f"Stream vacío o bloqueado "
                f"session={session_id}"
            )

            final_response = SECURITY_FALLBACK

            yield SECURITY_FALLBACK

        elif any(
            keyword in final_response.lower()
            for keyword in BLOCKED_KEYWORDS
        ):

            logger.warning(
                f"Contenido bloqueado detectado "
                f"session={session_id}"
            )

            final_response = SECURITY_FALLBACK

            yield SECURITY_FALLBACK

        messages.append(
            Message(
                id=str(uuid.uuid4()),
                role="assistant",
                content=final_response,
                timestamp=datetime.now(),
            )
        )

        await _persist_conversation(
            memory_repo,
            session_id,
            messages
        )

        total_duration = (
            time.perf_counter() - request_start
        )

        logger.info(
            f"TOTAL_RESPONSE "
            f"model={model_name} "
            f"session={session_id} "
            f"time={total_duration:.3f}s"
        )

    return (
        wrapped_stream(),
        model_name,
        session_id
    )
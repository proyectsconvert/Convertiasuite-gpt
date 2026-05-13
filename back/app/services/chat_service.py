"""
Chat orchestration service with proper streaming, state management, and security.
"""

import uuid
import logging
import time
from datetime import datetime
from typing import AsyncIterator

from app.security.input_sanitizer import (
    sanitize_input,
    validate_history_length,
    _truncate_history,
)
from app.security.output_guard import (
    sanitize_output,
    get_safety_fallback,
    validate_chunk_realtime,
    output_validator,
    OutputValidationAction,
)
from app.security.prompt_injection_guard import (
    detect_prompt_injection,
    validate_prompt_safety,
)
from app.security.risk_scorer import risk_scorer
from app.security.exceptions import (
    SecurityException,
    PromptInjectionException,
    OutputLeakException,
    PolicyViolationException,
)
from app.services.model_router import route_model
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.core.model_config import MODELS
from app.domain.entities.message import Message
from app.services.prompts.prompt_builder import get_system_prompt

logger = logging.getLogger(__name__)

MAX_STREAM_SECONDS = 120


async def _persist_conversation(
    memory_repo: IMemoryRepository,
    session_id: str,
    messages: list,
):
    """Persiste conversación. NO persiste mensajes inseguros/maliciosos."""
    try:
        await memory_repo.save_messages(
            session_id,
            [m.to_dict() for m in messages]
        )
    except Exception as e:
        logger.error(f"Persistence error session={session_id}: {str(e)}")


async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
):
    """
    Orquestación principal de chat.
    Pipeline:
    1. Risk scoring (bloqueo temprano)
    2. Input sanitization
    3. Load History
    4. Generate Stream (con validación en tiempo real)
    5. Output validation (post-generation)
    6. Persist Conversation
    """
    model_name = None
    session_id = request.session_id or str(uuid.uuid4())
    request_start = time.perf_counter()

    try:
        # ──── PASO 1: RISK SCORING (bloqueo temprano)
        risk = risk_scorer.score(request.message)
        if risk.should_block:
            logger.warning(
                f"Risk score blocked: {risk.level.value} "
                f"(score={risk.total_score:.2f}) session={session_id}"
            )
            raise SecurityException(
                "Consulta bloqueada por políticas de seguridad"
            )

        # ──── PASO 2: SANITIZAR INPUT
        try:
            clean_input = sanitize_input(request.message)
        except PolicyViolationException as e:
            logger.warning(f"Input policy violation: {str(e)}")
            raise

        # ──── PASO 3: DETECTAR INYECCIÓN
        try:
            validate_prompt_safety(clean_input, risk_level="HIGH")
        except PromptInjectionException:
            raise SecurityException("Entrada bloqueada por seguridad")

        # ──── PASO 4: CARGAR Y TRUNCAR HISTORIAL
        history = await memory_repo.get_messages(session_id) or []

        if len(history) > 10:
            history = _truncate_history(history, max_messages=10)
            logger.info(f"History truncated session={session_id}")

        sanitized_history = []
        for msg in history:
            try:
                if isinstance(msg, dict):
                    msg_obj = Message.from_dict(msg)
                else:
                    msg_obj = msg

                if msg_obj.role == "user":
                    try:
                        validate_prompt_safety(msg_obj.content, risk_level="MEDIUM")
                    except PromptInjectionException:
                        logger.warning("Skipping malicious history message")
                        continue

                sanitized_history.append(msg_obj)
            except Exception as e:
                logger.warning(f"Error sanitizing history message: {str(e)}")
                continue

        # ──── PASO 5: CONSTRUIR MENSAJES
        messages = sanitized_history.copy()
        messages.append(
            Message(
                id=str(uuid.uuid4()),
                role="user",
                content=clean_input,
                timestamp=datetime.now(),
            )
        )

        # ──── PASO 6: RUTEAR A MODELO
        model_key = route_model(
            message=clean_input,
            user_role=request.user_role,
            has_attachment=request.has_attachment,
        )

        model_name = MODELS[model_key]["model"]

        logger.info(
            f"ROUTE model={model_name} session={session_id}"
        )

        # ──── PASO 7: GENERAR STREAM CON VALIDACIÓN
        stream = llm_provider.generate_stream(
            messages,
            model_key
        )

        async def wrapped_stream():
            """
            Wrapper del stream con:
            - Validación en tiempo real (chunk por chunk)
            - Timeout
            - Persistencia
            - Validación final post-generation
            - Conversation recovery
            """
            full_response = ""
            first_token_time = None
            stream_start = time.perf_counter()
            validation_failed = False
            stream_stopped = False
            fallback_emitted = False

            try:
                async for chunk in stream:
                    elapsed = time.perf_counter() - stream_start
                    if elapsed > MAX_STREAM_SECONDS:
                        logger.warning(
                            f"Stream timeout session={session_id} elapsed={elapsed:.1f}s"
                        )
                        raise TimeoutError("Streaming timeout")

                    if chunk and first_token_time is None:
                        first_token_time = elapsed
                        logger.info(
                            f"TTFT model={model_name} session={session_id} time={first_token_time:.3f}s"
                        )

                    # Validación en tiempo real
                    if chunk:
                        is_safe, error_msg = validate_chunk_realtime(chunk)
                        if not is_safe:
                            logger.warning(
                                f"Chunk blocked: {error_msg} session={session_id}"
                            )
                            stream_stopped = True
                            validation_failed = True
                            break

                        full_response += chunk
                        yield chunk

                # Si stream fue detenido prematuramente, emitir fallback
                if stream_stopped and not fallback_emitted:
                    fallback = get_safety_fallback()
                    yield fallback
                    fallback_emitted = True
                    full_response = fallback

                # Validar output completo si stream no fue detenido
                elif not stream_stopped:
                    is_safe, action, _ = output_validator.validate_output(full_response)
                    if action == OutputValidationAction.BLOCK:
                        logger.warning(
                            f"Output blocked (post-gen) session={session_id}"
                        )
                        validation_failed = True
                        full_response = get_safety_fallback()
                    elif action == OutputValidationAction.REGENERATE:
                        logger.warning(
                            f"Output flagged for regeneration session={session_id}"
                        )
                        validation_failed = True
                        full_response = get_safety_fallback()

                # Persistir conversación
                messages.append(
                    Message(
                        id=str(uuid.uuid4()),
                        role="assistant",
                        content=full_response,
                        timestamp=datetime.now(),
                    )
                )

                await _persist_conversation(memory_repo, session_id, messages)

                total_elapsed = time.perf_counter() - stream_start
                logger.info(
                    f"STREAM_COMPLETE model={model_name} session={session_id} "
                    f"time={total_elapsed:.3f}s validation_failed={validation_failed} "
                    f"stream_stopped={stream_stopped}"
                )

            except TimeoutError:
                logger.error(f"Stream timeout session={session_id}")
                yield get_safety_fallback()
                return

            except Exception as e:
                logger.error(
                    f"Stream error session={session_id} type={type(e).__name__}: {str(e)}"
                )
                yield get_safety_fallback()
                return

        return (
            wrapped_stream(),
            model_name,
            session_id
        )

    except SecurityException as e:
        logger.warning(f"Security exception: {str(e)}")
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error session={session_id}: {type(e).__name__}"
        )
        raise
from datetime import datetime, UTC
import logging
import time
import uuid
from app.core.model_config import DEFAULT_MODEL_KEY, get_model_config
from app.domain.entities.message import Message
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.security.exceptions import PolicyViolationException, SecurityException
from app.security.input_sanitizer import _truncate_history, sanitize_input
from app.security.output_guard import (
    OutputValidationAction,
    get_safety_fallback,
    output_validator,
    validate_chunk_realtime,
)
from app.security.prompt_injection_guard import validate_prompt_safety
from app.security.risk_scorer import risk_scorer
from app.services.model_router import route_model

MODEL_CONFIG = get_model_config()

logger = logging.getLogger(__name__)

MAX_STREAM_SECONDS = 300
MAX_MESSAGES = 100


async def _persist_messages(
    memory_repo: IMemoryRepository,
    session_id: str,
    messages: list,
):
    try:
        trimmed_messages = messages[-MAX_MESSAGES:]

        await memory_repo.save_messages(
            session_id,
            [m.to_dict() for m in trimmed_messages],
        )

    except Exception as e:
        logger.error(
            "Persistence error session=%s error=%s",
            session_id,
            str(e),
        )


async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
    user_id: str,
):
    model_name = None
    request_start = time.perf_counter()
    session_id = request.session_id

    try:
        if not session_id:
            session_id = str(uuid.uuid4())
            await memory_repo.create_session(
                user_id=user_id,
                title=request.message[:40],
                session_id=session_id,
            )
            logger.info(
                "Session created session_id=%s user_id=%s",
                session_id,
                user_id,
            )
        else:
            existing_session = await memory_repo.get_session(session_id)
            if not existing_session:
                logger.warning(
                    "Session not found session_id=%s",
                    session_id,
                )
                await memory_repo.create_session(
                    user_id=user_id,
                    title=request.message[:40],
                    session_id=session_id,
                )

        risk = risk_scorer.score(request.message)
        if risk.should_block:
            logger.warning(
                "Risk blocked level=%s score=%.2f session=%s",
                risk.level.value,
                risk.total_score,
                session_id,
            )
            raise SecurityException("Consulta bloqueada por políticas de seguridad")

        try:
            clean_input = sanitize_input(request.message)
        except PolicyViolationException as e:
            logger.warning(
                "Policy violation session=%s error=%s",
                session_id,
                str(e),
            )
            raise

        history = await memory_repo.get_messages(session_id) or []

        if len(history) > 10:
            history = _truncate_history(history, max_messages=10)
            logger.info("History truncated session=%s", session_id)

        sanitized_history = []
        for msg in history:
            try:
                msg_obj = Message.from_dict(msg) if isinstance(msg, dict) else msg

                if msg_obj.role == "user":
                    try:
                        validate_prompt_safety(
                            msg_obj.content,
                            risk_level="LOW",
                        )
                    except Exception:
                        logger.warning(
                            "Skipping malicious history message session=%s",
                            session_id,
                        )
                        continue

                sanitized_history.append(msg_obj)
            except Exception as e:
                logger.warning(
                    "History sanitize error session=%s error=%s",
                    session_id,
                    str(e),
                )

        messages = sanitized_history.copy()

        user_attachments = []
        attachment_name = "archivo adjunto"
        attachment_type = "archivo"

        if request.has_attachment and request.extracted_context:
            attachment_name = request.attachment_name or attachment_name
            attachment_type = request.attachment_type or attachment_type
            user_attachments.append(
                {
                    "type": attachment_type,
                    "filename": attachment_name,
                    "content": request.extracted_context,
                }
            )
            logger.info(
                "Attachment context injected for model only session=%s context_length=%d",
                session_id,
                len(request.extracted_context),
            )

        user_message = Message(
            id=str(uuid.uuid4()),
            role="user",
            content=clean_input,
            timestamp=datetime.now(UTC),
            attachments=user_attachments,
        )
        messages.append(user_message)

        stream_messages = messages.copy()
        if request.has_attachment and request.extracted_context:
            stream_messages.append(
                Message(
                    id=str(uuid.uuid4()),
                    role="user",
                    content=(
                        f"El usuario adjuntó el archivo '{attachment_name}' ({attachment_type}).\n"
                        "A continuación están los datos pre-procesados con métricas ya calculadas.\n"
                        "Usa estos números exactos para responder. No inventes datos.\n\n"
                        "```\n"
                        f"{request.extracted_context}\n"
                        "```\n\n"
                        f"Pregunta del usuario sobre este archivo: {clean_input}"
                    ),
                    timestamp=datetime.now(UTC),
                )
            )

        model_key = route_model(
            message=clean_input,
            user_role=request.user_role,
            attachment_type=request.attachment_type,
        )
        model_info = MODEL_CONFIG.get(model_key, MODEL_CONFIG[DEFAULT_MODEL_KEY])
        model_name = model_info["model"]

        logger.info(
            "ROUTE model=%s session=%s",
            model_name,
            session_id,
        )

        stream = llm_provider.generate_stream(stream_messages, model_key)

        async def wrapped_stream():
            full_response = ""
            first_token_time = None
            stream_start = time.perf_counter()
            stream_stopped = False
            fallback_emitted = False

            try:
                async for chunk in stream:
                    elapsed = time.perf_counter() - stream_start

                    if elapsed > MAX_STREAM_SECONDS:
                        logger.warning(
                            "Stream timeout session=%s elapsed=%.1fs",
                            session_id,
                            elapsed,
                        )
                        raise TimeoutError("Streaming timeout")

                    if chunk and first_token_time is None:
                        first_token_time = elapsed
                        logger.info(
                            "TTFT model=%s session=%s time=%.3fs",
                            model_name,
                            session_id,
                            first_token_time,
                        )

                    if chunk:
                        is_safe, error_msg = validate_chunk_realtime(chunk)
                        if not is_safe:
                            logger.warning(
                                "Chunk blocked session=%s error=%s",
                                session_id,
                                error_msg,
                            )
                            stream_stopped = True
                            break

                        full_response += chunk
                        yield chunk

                if stream_stopped and not fallback_emitted:
                    fallback = get_safety_fallback()
                    yield fallback
                    fallback_emitted = True
                    full_response = fallback

                elif not stream_stopped:
                    is_safe, action, _ = output_validator.validate_output(full_response)
                    if action == OutputValidationAction.BLOCK:
                        logger.warning("Output blocked session=%s", session_id)
                        full_response = get_safety_fallback()
                    elif action == OutputValidationAction.REGENERATE:
                        logger.warning("Output regenerate session=%s", session_id)
                        full_response = get_safety_fallback()

                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    role="assistant",
                    content=full_response,
                    timestamp=datetime.now(UTC),
                )
                messages.append(assistant_message)

                await _persist_messages(memory_repo, session_id, messages)

                total_elapsed = time.perf_counter() - stream_start
                logger.info(
                    "STREAM_COMPLETE model=%s session=%s time=%.3fs",
                    model_name,
                    session_id,
                    total_elapsed,
                )

            except TimeoutError:
                logger.error("Stream timeout session=%s", session_id)
                fallback = get_safety_fallback()
                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    role="assistant",
                    content=fallback,
                    timestamp=datetime.now(UTC),
                )
                messages.append(assistant_message)
                await _persist_messages(memory_repo, session_id, messages)
                yield fallback

            except Exception as e:
                logger.error(
                    "Stream error session=%s type=%s error=%s",
                    session_id,
                    type(e).__name__,
                    str(e),
                )
                fallback = get_safety_fallback()
                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    role="assistant",
                    content=fallback,
                    timestamp=datetime.now(UTC),
                )
                messages.append(assistant_message)
                await _persist_messages(memory_repo, session_id, messages)
                yield fallback

        total_request_time = time.perf_counter() - request_start
        logger.info(
            "CHAT_READY session=%s prep_time=%.3fs",
            session_id,
            total_request_time,
        )

        return (
            wrapped_stream(),
            model_name,
            session_id,
        )

    except SecurityException:
        raise
    except Exception:
        logger.exception(
            "Unexpected process_chat error session=%s",
            session_id,
        )
        raise

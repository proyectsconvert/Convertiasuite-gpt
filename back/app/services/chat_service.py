from datetime import datetime, UTC
import asyncio
import logging
import time
import uuid
import json
import re
from app.core.model_config import DEFAULT_MODEL_KEY, get_model_config
from app.domain.entities.message import Message
from app.domain.contracts import PromptContract
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.message_repository import IMessageRepository
from app.security.risk_scorer import risk_scorer
from app.services.model_router import route_model, build_routing_context
from app.services.intent_classifier import IntentClassifier
from app.services.document_processing.document_manager import DocumentManager
from app.services.document_processing.chunk_processor import (
    needs_chunking,
    split_text_into_chunks,
    build_partial_prompt,
    build_synthesis_prompt,
)
from app.services.document_generation.document_generator import DocumentGenerator
from app.security.exceptions import (
    PolicyViolationException,
    SecurityException,
)

from app.security.input_sanitizer import (
    sanitize_input,
    truncate_history_by_tokens,
)

from app.services.prompts.response_validator import (
    ResponseValidator,
)

from app.security.output_guard import (
    OutputValidationAction,
    get_safety_fallback,
    get_unavailable_fallback,
    get_timeout_fallback,
    output_validator,
    validate_chunk_realtime,
)

from app.security.prompt_injection_guard import (
    validate_prompt_safety,
)

MODEL_CONFIG = get_model_config()
logger = logging.getLogger(__name__)

MAX_STREAM_SECONDS = 600


def _extract_document_generation_request(response_text: str) -> tuple[str, dict | None]:
    try:
        json_pattern = r'```(?:json)?\s*(\{[\s\S]*?"generate_document"[\s\S]*?\})\s*```'
        match = re.search(json_pattern, response_text)

        if not match:
            json_pattern = r'(\{[\s\S]*?"generate_document"[\s\S]*?\})'
            match = re.search(json_pattern, response_text)

        if match:
            json_str = match.group(1)
            data = json.loads(json_str)

            if "generate_document" in data:
                doc_request = data["generate_document"]

                # Extrae el JSON del texto para limpiarlo
                cleaned_text = response_text.replace(match.group(0), "").strip()

                return cleaned_text, doc_request
    except (json.JSONDecodeError, AttributeError) as e:
        logger.debug(f"No document generation request found: {e}")

    return response_text, None


async def _generate_and_attach_document(
    document_request: dict,
    message: Message,
    session_id: str,
    user_id: str,
) -> bool:
    try:
        filename = document_request.get("filename", "documento")
        format_type = document_request.get("format", "pdf").lower()
        content = document_request.get("content")

        if not content:
            logger.warning("Document generation request missing content")
            return False

        # Genera el documento
        generator = DocumentGenerator()
        file_bytes = generator.generate(content, fmt=format_type)

        # Asegura extensión correcta
        ext_map = {
            "pdf": ".pdf",
            "docx": ".docx",
            "xlsx": ".xlsx",
            "pptx": ".pptx",
            "csv": ".csv",
            "json": ".json",
            "txt": ".txt",
            "md": ".md",
        }
        ext = ext_map.get(format_type, f".{format_type}")
        if not filename.endswith(ext):
            filename = f"{filename}{ext}"

        artifact = {
            "filename": filename,
            "type": format_type,
            "url": None,
            "content": None,  
        }

        if not hasattr(message, "artifacts"):
            message.artifacts = []
        message.artifacts.append(artifact)

        logger.info(
            f"Document generated and attached: filename={filename}, format={format_type}",
            extra={"message_id": message.id, "session_id": session_id},
        )

        return True

    except Exception as e:
        logger.error(f"Error generating document: {e}")
        return False


async def _persist_messages(
    memory_repo: IMessageRepository,
    session_id: str,
    messages: list,
):
    try:
        trimmed_messages = truncate_history_by_tokens(messages, max_tokens=4000)

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
    memory_repo,
    user_id: str,
    document_manager: DocumentManager | None = None,
    intent_classifier: IntentClassifier | None = None,
):
    model_name = None
    request_start = time.perf_counter()
    session_id = request.session_id
    trace_id = str(uuid.uuid4())

    try:
        if not session_id:
            session_id = str(uuid.uuid4())

            await memory_repo.create_session(
                user_id=user_id,
                title=request.message[:40],
                session_id=session_id,
            )

            logger.info(
                "Session created session_id=%s user_id=%s trace_id=%s",
                session_id,
                user_id,
                trace_id,
            )

        else:
            existing_session = await memory_repo.get_session(session_id)

            if not existing_session:
                logger.warning(
                    "Session not found session_id=%s trace_id=%s",
                    session_id,
                    trace_id,
                )

                await memory_repo.create_session(
                    user_id=user_id,
                    title=request.message[:40],
                    session_id=session_id,
                )
            elif existing_session.get("user_id") != user_id:
                logger.error(
                    "Unauthorized session access attempt user_id=%s session_id=%s trace_id=%s",
                    user_id,
                    session_id,
                    trace_id,
                )
                raise SecurityException("No tienes permiso para acceder a esta sesión")

        risk = risk_scorer.score(request.message)

        if risk.should_block:
            logger.warning(
                "Risk blocked level=%s score=%.2f session=%s trace_id=%s",
                risk.level.value,
                risk.total_score,
                session_id,
                trace_id,
            )

            raise SecurityException("Consulta bloqueada por políticas de seguridad")

        try:
            clean_input = sanitize_input(request.message)

        except PolicyViolationException as e:
            logger.warning(
                "Policy violation session=%s error=%s trace_id=%s",
                session_id,
                str(e),
                trace_id,
            )

            raise

        history = await memory_repo.get_messages(session_id) or []

        history = truncate_history_by_tokens(history, max_tokens=2000)

        sanitized_history = []

        for msg in history:
            try:
                msg_obj = Message.from_dict(msg) if isinstance(msg, dict) else msg

                if msg_obj.role == "user":
                    try:
                        validate_prompt_safety(
                            msg_obj.content,
                            risk_level="MEDIUM",  
                        )

                    except Exception:
                        logger.warning(
                            "Skipping malicious history message session=%s trace_id=%s",
                            session_id,
                            trace_id,
                        )

                        continue

                sanitized_history.append(msg_obj)

            except Exception as e:
                logger.warning(
                    "History sanitize error session=%s error=%s trace_id=%s",
                    session_id,
                    str(e),
                    trace_id,
                )

        user_attachments = []
        attachment_name = "archivo adjunto"
        attachment_type = "archivo"
        is_image = False

        if request.extracted_context:
            attachment_name = request.attachment_name or attachment_name
            attachment_type = request.attachment_type or attachment_type
            is_image = (
                attachment_type.startswith("image") or attachment_type == "vision"
            )

            user_attachments.append(
                {
                    "type": attachment_type,
                    "filename": attachment_name,
                }
            )

            if document_manager and session_id:
                try:
                    if not is_image:
                        await document_manager.process_document(
                            file_content=request.extracted_context.encode("utf-8"),
                            filename=attachment_name,
                            session_id=uuid.UUID(session_id),
                            user_id=uuid.UUID(user_id),
                            tags=[attachment_type],
                            metadata={"upload_source": "chat_inference"},
                        )

                    if hasattr(memory_repo, "save_attachment"):
                        storage_path = f"attachments/{session_id}/{attachment_name}"
                        await memory_repo.save_attachment(
                            session_id=session_id,
                            storage_path=storage_path,
                            file_name=attachment_name,
                            mime_type=attachment_type,
                            file_size=len(request.extracted_context),
                            extracted_text=request.extracted_context,
                        )
                except Exception as doc_err:
                    logger.warning(
                        "Failed to persist uploaded document in process_chat session=%s error=%s",
                        session_id,
                        str(doc_err),
                    )

            logger.info(
                "Attachment metadata registered session=%s trace_id=%s",
                session_id,
                trace_id,
            )
        async def _get_doc_context() -> str:
            if document_manager and session_id and not is_image:
                try:
                    return await document_manager.get_relevant_context(
                        session_id=uuid.UUID(session_id),
                        query=clean_input,
                        limit_chunks=3,
                    )
                except Exception as e:
                    logger.warning(
                        "Contextual retrieval failed session=%s error=%s",
                        session_id,
                        str(e),
                    )
            return ""

        async def _classify_intent() -> str:
            routing_message = build_routing_context(clean_input, sanitized_history)
            return await route_model(
                message=routing_message,
                user_role=request.user_role,
                attachment_type=request.attachment_type,
                intent_classifier=intent_classifier,
            )

        doc_context, model_key = await asyncio.gather(
            _get_doc_context(),
            _classify_intent(),
        )

        if not doc_context and request.extracted_context and not is_image:
            is_tabular = request.attachment_type in ("csv", "excel")
            if is_tabular:
                raw_text = request.extracted_context

                if needs_chunking(raw_text):
                    # --- Map-Reduce para archivos grandes ---
                    chunks = split_text_into_chunks(raw_text)
                    logger.info(
                        "Tabular file requires chunked processing: %d chunks session=%s trace_id=%s",
                        len(chunks), session_id, trace_id,
                    )

                    # Map: analizar cada chunk con el modelo (síncrono en el contexto actual)
                    # Nota: para archivos muy grandes se puede paralelizar con asyncio.gather
                    partial_results: list[str] = []
                    for i, chunk in enumerate(chunks):
                        partial_prompt = build_partial_prompt(
                            chunk=chunk,
                            chunk_index=i,
                            total_chunks=len(chunks),
                            filename=attachment_name,
                            user_question=clean_input,
                        )
                        try:
                            partial_result = await llm_provider.generate_once(
                                partial_prompt, model_key
                            )
                            partial_results.append(partial_result)
                        except Exception as chunk_err:
                            logger.warning(
                                "Chunk %d/%d failed session=%s error=%s",
                                i + 1, len(chunks), session_id, str(chunk_err),
                            )
                            partial_results.append(f"[Fragmento {i+1}: error al procesar]")

                    # Reduce: síntesis final
                    doc_context = build_synthesis_prompt(
                        partial_results=partial_results,
                        user_question=clean_input,
                        filename=attachment_name,
                        total_chunks=len(chunks),
                    )
                    logger.info(
                        "Chunked synthesis ready session=%s total_chunks=%d trace_id=%s",
                        session_id, len(chunks), trace_id,
                    )
                else:
                    # Archivo pequeño: procesar directamente sin chunking
                    doc_context = (
                        f"## DOCUMENTO TABULAR COMPLETO:\n\n### Archivo: {attachment_name}\n{raw_text}"
                    )
            else:
                paragraphs = [
                    p.strip() for p in request.extracted_context.split("\n\n") if p.strip()
                ]
                query_words = set(clean_input.lower().split())
                scored = []
                for p in paragraphs:
                    p_words = set(p.lower().split())
                    overlap = len(query_words.intersection(p_words))
                    score = overlap / len(query_words) if query_words else 0
                    scored.append((score, p))
                scored.sort(key=lambda x: x[0], reverse=True)

                top_chunks = []
                for score, p in scored[:3]:
                    if score > 0 or not top_chunks:
                        trimmed = p if len(p) <= 1500 else p[:1500] + "..."
                        top_chunks.append(f"### Fragmento de {attachment_name}:\n{trimmed}")
                if top_chunks:
                    doc_context = (
                        "## DOCUMENTOS RELACIONADOS (FALLBACK RETRIEVED CONTEXT):\n\n"
                        + "\n\n".join(top_chunks)
                    )

        message_content = clean_input
        images_list = []
        if request.extracted_context and is_image:
            images_list = [request.extracted_context]
            if clean_input:
                message_content = f"[El usuario ha adjuntado la imagen: {attachment_name}]\nPregunta del usuario sobre este archivo: {clean_input}"
            else:
                message_content = (
                    f"[El usuario ha adjuntado la imagen: {attachment_name}]"
                )

        user_message = Message(
            id=str(uuid.uuid4()),
            role="user",
            content=message_content,
            timestamp=datetime.now(UTC),
            attachments=user_attachments,
            images=images_list,
        )

        messages = sanitized_history.copy()
        messages.append(user_message)

        model_messages = []
        for msg in messages:
            model_messages.append(
                Message(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp,
                    attachments=[],
                    images=getattr(msg, "images", []),
                )
            )

        if doc_context and model_messages:
            last_msg = model_messages[-1]
            if last_msg.role == "user":
                last_msg.content = f"{last_msg.content}\n\n{doc_context}"
                logger.info(
                    "Injected retrieved context into model query session=%s context_length=%d trace_id=%s",
                    session_id,
                    len(doc_context),
                    trace_id,
                )


        model_info = MODEL_CONFIG.get(
            model_key,
            MODEL_CONFIG[DEFAULT_MODEL_KEY],
        )

        model_name = model_info["model"]

        logger.info(
            "ROUTE model=%s session=%s trace_id=%s",
            model_name,
            session_id,
            trace_id,
        )

        stream = llm_provider.generate_stream(
            model_messages,
            model_key,
        )

        async def wrapped_stream():
            full_response = ""
            first_token_time = None
            stream_start = time.perf_counter()
            stream_stopped = False

            try:
                # Start stream status in Redis
                if hasattr(memory_repo, "start_stream"):
                    await memory_repo.start_stream(session_id)

                async for chunk in stream:
                    if hasattr(
                        memory_repo, "should_stop_stream"
                    ) and await memory_repo.should_stop_stream(session_id):
                        logger.info(
                            "Stream stopped by user session=%s trace_id=%s",
                            session_id,
                            trace_id,
                        )
                        stream_stopped = True
                        break

                    elapsed = time.perf_counter() - stream_start

                    if elapsed > MAX_STREAM_SECONDS:
                        logger.warning(
                            "Stream timeout session=%s elapsed=%.1fs trace_id=%s",
                            session_id,
                            elapsed,
                            trace_id,
                        )
                        raise TimeoutError("Streaming timeout")

                    if chunk and first_token_time is None:
                        first_token_time = elapsed
                        logger.info(
                            "TTFT model=%s session=%s time=%.3fs trace_id=%s",
                            model_name,
                            session_id,
                            first_token_time,
                            trace_id,
                        )

                    if chunk:
                        is_safe, error_msg = validate_chunk_realtime(chunk)

                        if not is_safe:
                            logger.warning(
                                "Chunk blocked session=%s error=%s trace_id=%s",
                                session_id,
                                error_msg,
                                trace_id,
                            )
                            stream_stopped = True
                            break

                        full_response += chunk
                        yield chunk

                if stream_stopped:
                    logger.info(
                        "Stream terminated early session=%s trace_id=%s",
                        session_id,
                        trace_id,
                    )
                else:
                    is_safe, action, _ = output_validator.validate_output(full_response)

                    if action == OutputValidationAction.BLOCK:
                        logger.warning(
                            "Output blocked session=%s trace_id=%s",
                            session_id,
                            trace_id,
                        )
                        full_response = get_safety_fallback(request.user_role)

                    elif action == OutputValidationAction.REGENERATE:
                        logger.warning(
                            "Output regenerate session=%s trace_id=%s",
                            session_id,
                            trace_id,
                        )
                        full_response = get_safety_fallback(request.user_role)

                    else:
                        contract = PromptContract.for_role(request.user_role)

                        safety_response = ResponseValidator.validate_format(
                            full_response,
                            contract,
                        )

                        if not ResponseValidator.is_response_usable(safety_response):
                            logger.warning(
                                "Contract validation failed session=%s violations=%s trace_id=%s",
                                session_id,
                                safety_response.violations,
                                trace_id,
                            )

                            safety_response = ResponseValidator.apply_fallback_template(
                                full_response,
                                contract,
                                safety_response,
                            )

                        full_response = safety_response.response_to_use

                        logger.info(
                            "Contract validation completed session=%s valid=%s score=%.2f jailbreak=%s trace_id=%s",
                            session_id,
                            safety_response.is_valid,
                            safety_response.confidence_score,
                            safety_response.jailbreak_detected,
                            trace_id,
                        )

                if full_response.strip():
                    cleaned_response, document_request = (
                        _extract_document_generation_request(full_response)
                    )
                    full_response = cleaned_response

                    assistant_message = Message(
                        id=str(uuid.uuid4()),
                        role="assistant",
                        content=full_response,
                        timestamp=datetime.now(UTC),
                    )

                    if document_request:
                        await _generate_and_attach_document(
                            document_request,
                            assistant_message,
                            session_id,
                            user_id,
                        )

                    messages.append(assistant_message)

                    await _persist_messages(
                        memory_repo,
                        session_id,
                        messages,
                    )

                    # Record usage to the database in background
                    try:
                        tokens_in = len(request.message) // 4 if request.message else 0
                        tokens_out = len(full_response) // 4 if full_response else 0
                        from app.services.usage_service import record_usage
                        asyncio.create_task(
                            record_usage(
                                user_id=user_id,
                                model_name=model_name,
                                tokens_in=tokens_in,
                                tokens_out=tokens_out
                            )
                        )
                    except Exception as usage_err:
                        logger.error(f"Error launching usage logging: {usage_err}")

                total_elapsed = time.perf_counter() - stream_start

                logger.info(
                    "STREAM_COMPLETE model=%s session=%s time=%.3fs trace_id=%s",
                    model_name,
                    session_id,
                    total_elapsed,
                    trace_id,
                )

            except TimeoutError:
                logger.error(
                    "Stream timeout session=%s trace_id=%s",
                    session_id,
                    trace_id,
                )

                fallback = get_timeout_fallback(request.user_role)

                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    role="assistant",
                    content=fallback,
                    timestamp=datetime.now(UTC),
                )

                messages.append(assistant_message)

                await _persist_messages(
                    memory_repo,
                    session_id,
                    messages,
                )

                yield fallback

            except Exception as e:
                logger.error(
                    "Stream error session=%s type=%s error=%s trace_id=%s",
                    session_id,
                    type(e).__name__,
                    str(e),
                    trace_id,
                )

                fallback = get_unavailable_fallback(request.user_role)

                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    role="assistant",
                    content=fallback,
                    timestamp=datetime.now(UTC),
                )

                messages.append(assistant_message)

                await _persist_messages(
                    memory_repo,
                    session_id,
                    messages,
                )

                yield fallback

            finally:
                if hasattr(memory_repo, "cleanup_stream"):
                    await memory_repo.cleanup_stream(session_id)

        total_request_time = time.perf_counter() - request_start

        logger.info(
            "CHAT_READY session=%s prep_time=%.3fs trace_id=%s",
            session_id,
            total_request_time,
            trace_id,
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
            "Unexpected process_chat error session=%s trace_id=%s",
            session_id,
            trace_id,
        )

        raise

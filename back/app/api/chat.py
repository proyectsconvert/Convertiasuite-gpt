from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, File, UploadFile
from fastapi.responses import StreamingResponse
import logging
import json
from datetime import datetime
import re
import uuid
from typing import List
from typing import Optional
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.security.exceptions import SecurityException
from app.security.output_guard import get_safety_fallback
from app.dependencies.auth import get_current_user
from app.services.chat.chat_service import process_chat
from app.services.documents.document_processing.document_manager import DocumentManager
from app.domain.interfaces.rag_repository import IRagRepository

from app.schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
    MessageDTO,
    VoiceChatRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def get_llm_provider(request: Request) -> ILlmProvider:
    return request.app.state.llm_provider


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory


def get_document_manager(request: Request) -> DocumentManager:
    return request.app.state.document_manager


def get_intent_classifier(request: Request):
    return getattr(request.app.state, "intent_classifier", None)


def get_rag_repository(request: Request) -> IRagRepository | None:
    return getattr(request.app.state, "rag_repository", None)


async def sse_message(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"

       

@router.post("/stream")

async def send_message_stream(
    request: ChatRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
    llm_provider: ILlmProvider = Depends(get_llm_provider),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    document_manager: DocumentManager = Depends(get_document_manager),
    intent_classifier=Depends(get_intent_classifier),
    rag_repository: IRagRepository | None = Depends(get_rag_repository),
):

    user_id = current_user["id"]

    async def event_generator():
        session_id = None
        model = None

        try:
            stream, model, session_id = await process_chat(
                request,
                llm_provider,
                memory_repo,
                user_id=user_id,
                document_manager=document_manager,
                intent_classifier=intent_classifier,
                rag_repository=rag_repository,
            )

            yield await sse_message(
                "start", {"session_id": session_id, "model": model or "unknown"}
            )

            async for chunk in stream:
                if await http_request.is_disconnected():
                    logger.info(f"Client disconnected session={session_id}")
                    break

                if chunk:
                    yield await sse_message("chunk", {"content": chunk})

            yield await sse_message("done", {"session_id": session_id})

        except SecurityException:
            fallback = get_safety_fallback(request.user_role)

            yield await sse_message(
                "start", {"session_id": session_id or "unknown", "model": "security"}
            )

            yield await sse_message("chunk", {"content": fallback})

            yield await sse_message("done", {"session_id": session_id or "unknown"})

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")

            fallback = get_safety_fallback(request.user_role)

            yield await sse_message(
                "start", {"session_id": session_id or "unknown", "model": "error"}
            )

            yield await sse_message("chunk", {"content": fallback})

            yield await sse_message("done", {"session_id": session_id or "unknown"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.post("/voice-stream")
async def send_voice_stream(
    request: VoiceChatRequest,
    http_request:Request,
    current_user : dict = Depends(get_current_user),
    llm_provider : ILlmProvider = Depends(get_llm_provider),
    memory_repo : IMemoryRepository = Depends(get_memory_repo),
    document_manager: DocumentManager = Depends(get_document_manager),
    intent_classifier = Depends(get_intent_classifier),
    rag_repository: IRagRepository | None = Depends(get_rag_repository,)
):
    chat_request = ChatRequest(
        message=request.message,
        user_role=request.user_role,
        session_id=request.call_id,
    )
    stream, model, session_id = await process_chat(
        chat_request,
        llm_provider,
        memory_repo,
        user_id=current_user["id"],
        document_manager=document_manager,
        intent_classifier=intent_classifier,
        rag_repository=rag_repository,
    )

    return{
        "status":"ok",
        "session_id": session_id,
    }
@router.get("/voice-greeting")
async def voice_greeting(
    current_user: dict = Depends(get_current_user),
):
    """
    Genera el saludo inicial de OlivIA según la hora del día.
    El texto se convierte directamente a voz usando Qwen TTS.
    """
    try:
        import base64
        from app.infra.clients.tts_client import QwenTTSClient

        now = datetime.now()
        hour = now.hour

        if 5 <= hour < 12:
            greeting = "Buenos días, soy OlivIA. ¿En qué puedo ayudarte?"
        elif 12 <= hour < 19:
            greeting = "Buenas tardes, soy OlivIA. ¿En qué puedo ayudarte?"
        else:
            greeting = "Buenas noches, soy OlivIA. ¿En qué puedo ayudarte?"

        tts_client = QwenTTSClient()

        audio_bytes = await tts_client.generate_speech(greeting)

        audio_base64 = None

        if audio_bytes:
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "text": greeting,
            "audio_base64": audio_base64,
        }

    except Exception as e:
        logger.error(
            f"Error generando saludo de OlivIA: {e}",
            exc_info=True,
        )

        raise HTTPException(
            status_code=500,
            detail="No se pudo generar el saludo de OlivIA",
        )



@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    limit: int = Query(20, ge=1, le=100),
    cursor_updated_at: Optional[str] = None,
    cursor_id: Optional[str] = Query(None),
):
    return await memory_repo.get_session_list(
        user_id=current_user["id"],
        limit=limit,
        cursor_updated_at=cursor_updated_at,
        cursor_id=cursor_id,
    )

    # user_id = current_user["id"]
    # sessions = await memory_repo.get_session_list(user_id)
    # return SessionListResponse(sessions=sessions)


@router.post("/sessions", response_model=SessionSummary)
async def create_session(
    title: str,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    user_id = current_user["id"]

    uuid_regex = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    if title == user_id or re.match(uuid_regex, title.lower()):
        title = "Nueva Conversación"

    session_id = await memory_repo.create_session(user_id, title)
    now = datetime.now().isoformat()

    return SessionSummary(
        id=session_id,
        title=title,
        created_at=now,
        updated_at=now,
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):

    user_id = current_user["id"]

    await memory_repo.delete_session(user_id, session_id)

    return {"status": "deleted"}


@router.post("/sessions/{session_id}/stop")
async def stop_session_stream(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    session = await memory_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.get("user_id") != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para acceder a esta sesión"
        )

    if hasattr(memory_repo, "stop_stream"):
        stopped = await memory_repo.stop_stream(session_id)
    else:
        stopped = False

    return {"status": "ok", "stopped": stopped}


@router.get("/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory_repo=Depends(get_memory_repo),
):
    session = await memory_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("user_id") != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para acceder a esta sesión"
        )

    messages = await memory_repo.get_messages(session_id)

    if messages is None:
        messages = []

    formatted_messages = []
    for msg in messages:
        is_dict = isinstance(msg, dict)

        msg_id = (
            msg.get("id", str(uuid.uuid4()))
            if is_dict
            else getattr(msg, "id", str(uuid.uuid4()))
        )
        role = msg.get("role", "user") if is_dict else getattr(msg, "role", "user")
        content = msg.get("content", "") if is_dict else getattr(msg, "content", "")

        timestamp = msg.get("timestamp") if is_dict else getattr(msg, "timestamp", None)
        if isinstance(timestamp, datetime):
            timestamp = timestamp.isoformat()
        elif not timestamp:
            timestamp = datetime.now().isoformat()

        raw_attachments = (
            msg.get("attachments", []) if is_dict else getattr(msg, "attachments", [])
        )
        raw_artifacts = (
            msg.get("artifacts", []) if is_dict else getattr(msg, "artifacts", [])
        )

        formatted_attachments = []
        for att in raw_attachments or []:
            filename = (
                att.get("filename")
                or att.get("file_name")
                or att.get("name")
                or "archivo"
            )
            att_type = att.get("type") or att.get("mime_type") or "archivo"
            formatted_attachments.append(
                {
                    "id": att.get("id") or att.get("attachment_id"),
                    "filename": filename,
                    "type": att_type,
                }
            )

        formatted_artifacts = []
        for artifact in raw_artifacts or []:
            formatted_artifacts.append(
                {
                    "id": (
                        artifact.get("id")
                        if isinstance(artifact, dict)
                        else getattr(artifact, "id", None)
                    ),
                    "filename": (
                        artifact.get("filename")
                        if isinstance(artifact, dict)
                        else getattr(artifact, "filename", "archivo")
                    ),
                    "type": (
                        artifact.get("type")
                        if isinstance(artifact, dict)
                        else getattr(artifact, "type", "file")
                    ),
                    "content": (
                        artifact.get("content")
                        if isinstance(artifact, dict)
                        else getattr(artifact, "content", None)
                    ),
                    "url": (
                        artifact.get("url")
                        if isinstance(artifact, dict)
                        else getattr(artifact, "url", None)
                    ),
                }
            )

        msg_images = msg.get("images", []) if is_dict else getattr(msg, "images", [])

        if not formatted_artifacts and role == "assistant" and isinstance(content, str):
            content_str = content.strip()
            if content_str and (
                "<html" in content_str.lower()
                or "<!doctype" in content_str.lower()
                or content_str.startswith("<section")
                or content_str.startswith("<main")
                or content_str.startswith("<header")
            ):
                formatted_artifacts.append(
                    {
                        "id": f"{msg_id}-html-fallback",
                        "filename": "landing.html",
                        "type": "html",
                        "content": content_str,
                        "url": None,
                    }
                )

        formatted_messages.append(
            {
                "id": msg_id,
                "role": role,
                "content": content,
                "timestamp": timestamp,
                "attachments": formatted_attachments,
                "artifacts": formatted_artifacts,
                "images": msg_images,
            }
        )

    return ChatHistoryResponse(messages=formatted_messages, session_id=session_id)


@router.put("/{session_id}/messages")
async def update_session_messages(
    session_id: str,
    messages: List[MessageDTO],
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    session = await memory_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.get("user_id") != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para modificar esta sesión"
        )

    try:
        messages_dicts = [msg.model_dump() for msg in messages]
        await memory_repo.save_messages(session_id, messages_dicts)
        return {"status": "ok", "updated": len(messages_dicts)}
    except Exception as e:
        logger.error(
            f"Error updating session messages session_id={session_id} error={e}"
        )
        raise HTTPException(status_code=500, detail="Error al guardar los mensajes")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    from app.services.chat.upload_service import UploadService

    upload_service = UploadService(document_manager, memory_repo)
    return await upload_service.process_upload(
        file=file, session_id=session_id, user_id=current_user["id"]
    )


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    call_id: str = Form(None),
    current_user: dict = Depends(get_current_user),
):

    try:
        import base64

        import uuid

        import base64
        from app.infra.clients.tts_client import QwenTTSClient

        from app.services.transcription_service import transcribe_audio
        from app.infra.clients.tts_client import QwenTTSClient
        from app.infra.clients.ollama_client import OllamaClient
        from app.infra.repositories.supabase.memory_repository import SupabaseMemoryRepository
        from app.services.storage_service import upload_file_to_supabase

        contents = await file.read()

        # 1. Transcripción con Vosk
        transcript = transcribe_audio(contents)
        logger.info(f"[Voice Pipeline] Transcripción obtenida: '{transcript}'")

        if not transcript or not transcript.strip():
            return {
                "call_id": call_id,
                "transcript": "",
                "response_text": "No se pudo entender el audio.",
                "audio_base64": None,
            }

        memory_repo = SupabaseMemoryRepository()
        user_id = current_user["id"]

        # 2. Asegurar llamada activa en voice_calls
        if not call_id:
            call_id = await memory_repo.create_voice_call(
                user_id=user_id,
                session_id=session_id,
                title=transcript[:40],
            )
            logger.info(f"Voice call created id={call_id} user={user_id}")

        # 3. Guardar audio en Supabase Storage
        audio_filename = f"voice_{uuid.uuid4()}.webm"
        
        audio_url = await upload_file_to_supabase(
            memory_repo = memory_repo,
            session_id = call_id,
            filename = audio_filename,
            file_bytes = contents,
            content_type = "audio/webm",

            )

        # 4. Guardar mensaje del usuario en voice_call_messages
        await memory_repo.save_voice_message(
            call_id=call_id,
            session_id=session_id,
            role="user",
            content=transcript,
            transcript=transcript,
            audio_path=audio_url or audio_filename,
        )

        # 5. Razonamiento con Ollama
        ollama = OllamaClient()
        response_text = await ollama.generate_chat(
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente de voz conciso y profesional. Responde de forma clara y directa sin usar formato markdown ni viñetas, ya que tu respuesta será leída por un sintetizador de voz.",
                },
                {"role": "user", "content": transcript},
            ],
            model="qwen2.5:7b",
            temperature=0.7,
        )
        logger.info(f"[Voice Pipeline] Respuesta de Ollama: '{response_text}'")

        # 6. Guardar mensaje del asistente en voice_call_messages
        await memory_repo.save_voice_message(
            call_id=call_id,
            session_id=session_id,
            role="assistant",
            content=response_text,
            transcript=response_text,
        )

        # 7. Respuesta -> Qwen TTS
        tts_client = QwenTTSClient()
        audio_bytes = await tts_client.generate_speech(response_text)

        audio_base64 = None
        if audio_bytes:
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "call_id": call_id,
            "transcript": transcript,
            "response_text": response_text,
            "audio_base64": audio_base64,
        }
    except Exception as e:
        logger.error(f"Error in upload_audio: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error en el flujo de voz: {str(e)}",
        )


@router.post("/transcribe-audio")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Endpoint para transcripción pura de audio a texto (STT).
    Se usa para el botón de micrófono en el chat input (dictado).
    """
    try:
        from app.services.transcription_service import transcribe_audio

        contents = await file.read()
        transcript = transcribe_audio(contents)
        logger.info(f"[Dictation STT] Transcripción obtenida: '{transcript}'")

        return {"transcript": transcript or ""}
    except Exception as e:
        logger.error(f"Error in transcribe_audio_endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al transcribir el audio: {str(e)}",
        )


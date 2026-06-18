from fastapi import APIRouter, Depends, Form, HTTPException, Request, File, UploadFile
from fastapi.responses import StreamingResponse
import logging
import json
from datetime import datetime
import re
import uuid
from typing import List

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.security.exceptions import SecurityException
from app.security.output_guard import get_safety_fallback
from app.dependencies.auth import get_current_user
from app.services.chat_service import process_chat
from app.services.document_processing.document_manager import DocumentManager

from app.schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
    MessageDTO,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def get_llm_provider(request: Request) -> ILlmProvider:
    return request.app.state.llm_provider


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory


def get_document_manager(request: Request) -> DocumentManager:
    return request.app.state.document_manager


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


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):

    user_id = current_user["id"]

    sessions = await memory_repo.get_session_list(user_id)

    return SessionListResponse(sessions=sessions)


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


@router.get("/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory_repo=Depends(get_memory_repo),
):
    messages = await memory_repo.get_messages(session_id)

    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")

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
                    "id": artifact.get("id")
                    if isinstance(artifact, dict)
                    else getattr(artifact, "id", None),
                    "filename": artifact.get("filename")
                    if isinstance(artifact, dict)
                    else getattr(artifact, "filename", "archivo"),
                    "type": artifact.get("type")
                    if isinstance(artifact, dict)
                    else getattr(artifact, "type", "file"),
                    "content": artifact.get("content")
                    if isinstance(artifact, dict)
                    else getattr(artifact, "content", None),
                    "url": artifact.get("url")
                    if isinstance(artifact, dict)
                    else getattr(artifact, "url", None),
                }
            )

        msg_images = msg.get("images", []) if is_dict else getattr(msg, "images", [])

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
    """
    Sobrescribe los mensajes de una sesión. Se usa principalmente para
    persistir ediciones de artefactos realizadas desde el panel de artefactos.
    """
    # Verificar que la sesión pertenece al usuario actual
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
    from app.services.upload_service import UploadService

    upload_service = UploadService(document_manager, memory_repo)
    return await upload_service.process_upload(
        file=file, session_id=session_id, user_id=current_user["id"]
    )


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        from app.services.transcription_service import transcribe_audio

        contents = await file.read()
        transcript = transcribe_audio(contents)

        return {"transcript": transcript}
    except Exception as e:
        logger.error(f"Error in upload_audio: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar y transcribir el audio: {str(e)}",
        )

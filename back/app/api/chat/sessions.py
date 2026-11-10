from fastapi import APIRouter, Depends, HTTPException, Query
import logging
from datetime import datetime
import re
import uuid
from typing import List, Optional

from app.domain.interfaces.memory_repository import IMemoryRepository
from app.dependencies.auth import get_current_user
from app.dependencies.chat_deps import get_memory_repo
from app.schemas.chat import (
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
    MessageDTO,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["sessions"])


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
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
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

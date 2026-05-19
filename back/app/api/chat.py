from io import BytesIO
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import openpyxl
import json
import logging
from datetime import datetime
import re
from fastapi import APIRouter, Depends, Form, HTTPException, Request, File, UploadFile
from fastapi.responses import StreamingResponse

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.security.exceptions import SecurityException
from app.security.output_guard import get_safety_fallback
from app.dependencies.auth import get_current_user

from app.services.chat_service import process_chat

from app.schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def get_llm_provider() -> ILlmProvider:
    from app.infra.providers.ollama_provider import OllamaProvider
    from app.infra.clients.ollama_client import OllamaClient

    return OllamaProvider(OllamaClient())


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory


async def sse_message(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


@router.post("/stream")
async def send_message_stream(
    request: ChatRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
    llm_provider: ILlmProvider = Depends(get_llm_provider),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):

    user_id = current_user["id"]

    async def event_generator():
        session_id = None
        model = None

        try:
            stream, model, session_id = await process_chat(
                request, llm_provider, memory_repo, user_id=user_id
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
            fallback = get_safety_fallback()

            yield await sse_message(
                "start", {"session_id": session_id or "unknown", "model": "security"}
            )

            yield await sse_message("chunk", {"content": fallback})

            yield await sse_message("done", {"session_id": session_id or "unknown"})

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")

            fallback = get_safety_fallback()

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
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):

    user_id = current_user["id"]

    messages = await memory_repo.get_messages(session_id)

    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return ChatHistoryResponse(messages=messages, session_id=session_id)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    allowed_types = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
    ]

    if file.content_type not in allowed_types and not file.filename.endswith(
        (".xlsx", ".csv")
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        contents = await file.read()

        wb = openpyxl.load_workbook(BytesIO(contents), data_only=True, read_only=True)
        sheet = wb.active

        excel_data_text = ""
        for row in sheet.iter_rows(values_only=True):
            # Omitimos filas completamente vacías
            if any(cell is not None and str(cell).strip() != "" for cell in row):
                row_text = " | ".join(
                    [str(cell).strip() if cell is not None else "" for cell in row]
                )
                excel_data_text += f"| {row_text} |\n"

        max_characters = 12000
        truncated_text = excel_data_text[:max_characters]

        if len(excel_data_text) > max_characters:
            truncated_text += "\n[... Archivo truncado por exceso de tamaño para optimizar el contexto ...]"

        logger.info(
            "Archivo Excel procesado en memoria exitosamente",
            extra={
                "user_id": current_user.get("id"),
                "uploaded_filename": file.filename,
                "session_id": session_id,
                "length": len(truncated_text),
            },
        )

        attachment_type = "excel"
        if file.filename.lower().endswith(".csv"):
            attachment_type = "csv"

        return {
            "filename": file.filename,
            "has_attachment": True,
            "extracted_context": truncated_text,
            "attachment_type": attachment_type,
        }

    except Exception as e:
        logger.error(f"Error procesando archivo {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al procesar la estructura del Excel: {str(e)}",
        )

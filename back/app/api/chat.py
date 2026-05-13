"""
Chat API endpoints with proper SSE streaming and cancellation handling.
"""

import json
import logging
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.security.exceptions import SecurityException
from app.security.output_guard import get_safety_fallback

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


def get_supabase_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.supabase


def get_memory_repo_by_type(request: Request, repo_type: str = "redis") -> IMemoryRepository:
    if repo_type == "supabase":
        return request.app.state.supabase
    return request.app.state.cache


async def sse_message(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


@router.post("/stream")
async def send_message_stream(
    request: ChatRequest,
    http_request: Request,
    repo_type: str = "redis",
    llm_provider: ILlmProvider = Depends(get_llm_provider),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = http_request.app.state.supabase

    async def event_generator():
        session_id = None
        model = None

        try:
            stream, model, session_id = await process_chat(
                request,
                llm_provider,
                memory_repo
            )

            yield await sse_message("start", {
                "session_id": session_id,
                "model": model or "unknown"
            })

            async for chunk in stream:
                if await http_request.is_disconnected():
                    logger.info(f"Client disconnected session={session_id}")
                    break

                if chunk:
                    yield await sse_message("chunk", {"content": chunk})

            yield await sse_message("done", {"session_id": session_id})

        except asyncio.CancelledError:
            logger.info(f"Stream cancelled session={session_id}")
            if session_id:
                yield await sse_message("error", {
                    "session_id": session_id,
                    "message": "Stream cancelled"
                })
            raise

        except SecurityException as e:
            logger.warning(f"Security exception: {str(e)}")
            fallback = get_safety_fallback()
            sid = session_id or "unknown"

            yield await sse_message("start", {
                "session_id": sid,
                "model": "security"
            })
            yield await sse_message("chunk", {"content": fallback})
            yield await sse_message("done", {"session_id": sid})

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            fallback = get_safety_fallback()
            sid = session_id or "unknown"

            yield await sse_message("start", {
                "session_id": sid,
                "model": "error"
            })
            yield await sse_message("chunk", {"content": fallback})
            yield await sse_message("done", {"session_id": sid})

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
    request: Request,
    user_id: str,
    repo_type: str = "redis",
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = request.app.state.supabase
    sessions = await memory_repo.get_session_list(user_id)
    return SessionListResponse(sessions=sessions)


@router.post("/sessions", response_model=SessionSummary)
async def create_session(
    request: Request,
    user_id: str,
    title: str,
    repo_type: str = "redis",
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = request.app.state.supabase
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
    request: Request,
    user_id: str,
    session_id: str,
    repo_type: str = "redis",
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = request.app.state.supabase
    await memory_repo.delete_session(user_id, session_id)
    return {"status": "deleted"}


@router.get("/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    request: Request,
    session_id: str,
    repo_type: str = "redis",
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = request.app.state.supabase
    messages = await memory_repo.get_messages(session_id)

    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return ChatHistoryResponse(
        messages=messages,
        session_id=session_id
    )
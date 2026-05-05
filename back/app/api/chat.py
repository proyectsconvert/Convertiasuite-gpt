import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository

from app.services.chat_service import (
    process_chat,
)

from app.schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
)

router = APIRouter(prefix="/chat", tags=["chat"])

def get_llm_provider() -> ILlmProvider:
    from app.infra.providers.ollama_provider import OllamaProvider
    from app.infra.clients.ollama_client import OllamaClient
    return OllamaProvider(OllamaClient())


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory  # Composite: Redis (cache) + Supabase (persist)


def get_supabase_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.supabase


def get_memory_repo_by_type(request: Request, repo_type: str = "redis") -> IMemoryRepository:
    if repo_type == "supabase":
        return request.app.state.supabase
    return request.app.state.cache


@router.post("/stream")
async def send_message_stream(
    request: ChatRequest,
    repo_type: str = "redis",
    llm_provider: ILlmProvider = Depends(get_llm_provider),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    if repo_type == "supabase":
        memory_repo = request.app.state.supabase

    async def event_generator():
        try:
            stream, model, session_id = await process_chat(
                request,
                llm_provider,
                memory_repo
            )

            yield f"data: {json.dumps({'type': 'start', 'session_id': session_id, 'model': model})}\n\n"

            async for chunk in stream:
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"

        except Exception as e:
            import traceback
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# --- SESIONES

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

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.models.schemas import ChatRequest, ChatResponse, ChatHistoryResponse, SessionListResponse, SessionSummary
from app.services.chat_service import process_chat, get_sessions, create_session, delete_session
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository

router = APIRouter(prefix="/chat", tags=["chat"])


def get_llm_provider() -> ILlmProvider:
    from app.infra.providers.ollama_provider import OllamaProvider
    from app.infra.clients.ollama_client import OllamaClient
    client = OllamaClient()
    return OllamaProvider(client)


def get_memory_repo() -> IMemoryRepository:
    from app.infra.memory.valkey_memory import ValkeyMemory
    from app.core.config import get_settings
    settings = get_settings()
    return ValkeyMemory(settings.redis_url)


@router.post("/", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    llm_provider: ILlmProvider = Depends(get_llm_provider),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    try:
        response, model, session_id = await process_chat(request, llm_provider, memory_repo)

        return ChatResponse(
            response=response,
            model_used=model,
            session_id=session_id,
        )

    except Exception as e:
        return ChatResponse(
            response="Error procesando la solicitud",
            model_used="none",
            session_id=request.session_id or "unknown",
        )


@router.get("/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    messages = await memory_repo.get(f"chat:messages:{session_id}")
    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatHistoryResponse(messages=messages, session_id=session_id)


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    user_id: str,
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    sessions = await get_sessions(user_id, memory_repo)
    return SessionListResponse(sessions=sessions)


@router.post("/sessions", response_model=SessionSummary)
async def create_session(
    user_id: str,
    title: str,
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    session_id = await create_session(user_id, title, memory_repo)
    return SessionSummary(id=session_id, title=title, created_at=datetime.now().isoformat(), updated_at=datetime.now().isoformat())


@router.delete("/sessions/{session_id}")
async def delete_session(
    user_id: str,
    session_id: str,
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
):
    await delete_session(user_id, session_id, memory_repo)
    return {"status": "deleted"}
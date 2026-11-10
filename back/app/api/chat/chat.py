from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, File, UploadFile
from fastapi.responses import StreamingResponse
import logging
import json
from typing import Optional

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.domain.interfaces.rag_repository import IRagRepository
from app.services.documents.document_processing.document_manager import DocumentManager
from app.security.exceptions import SecurityException
from app.security.output_guard import get_safety_fallback
from app.dependencies.auth import get_current_user
from app.services.chat.chat_service import process_chat
from app.schemas.chat import (
    ChatRequest,
    FeedbackRequest,
)

from app.dependencies.chat_deps import (
    get_llm_provider,
    get_memory_repo,
    get_document_manager,
    get_intent_classifier,
    get_rag_repository,
    get_campaign_repository,
    resolve_user_access_context,
    resolve_agent_context,
    build_agent_system_context,
    classify_query_safely,
    log_agent_query,
)
from app.api.chat.sessions import get_chat_history

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


async def sse_message(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


@router.get("/quick-actions")
async def get_chat_quick_actions(current_user: dict = Depends(get_current_user)):
    try:
        from app.infra.clients.supabase_client import SupabaseClient
        supabase = SupabaseClient().db
        resp = supabase.table("quick_actions").select("*").eq("is_active", True).order("order_index").execute()
        return {"status": "success", "actions": resp.data or []}
    except Exception as e:
        logger.error(f"Error fetching quick actions for chat: {e}", exc_info=True)
        return {"status": "error", "actions": []}


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
    campaign_repository=Depends(get_campaign_repository),
):

    user_id = current_user["id"]
    user_role = current_user.get("role", "default")
    request.user_role = user_role

    access_context = await resolve_user_access_context(user_id, campaign_repository)
    agent_context = await resolve_agent_context(user_id, campaign_repository)
    extra_system_prompt = (
        build_agent_system_context(agent_context) if agent_context else None
    )

    async def event_generator():
        session_id = None
        model = None

        try:
            stream, model, session_id, rag_info = await process_chat(
                request,
                llm_provider,
                memory_repo,
                user_id=user_id,
                document_manager=document_manager,
                intent_classifier=intent_classifier,
                rag_repository=rag_repository,
                access_context=access_context,
                campaign_context=agent_context,
                agent_mode=bool(agent_context),
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

            if agent_context:
                query_category = await classify_query_safely(
                    intent_classifier, request.message
                )
                await log_agent_query(
                    campaign_repository,
                    user_id=user_id,
                    campaign_id=agent_context["campaign_id"],
                    campaign_role=agent_context["campaign_role"],
                    query_text=request.message,
                    query_category=query_category,
                    rag_used=rag_info.get("used", False),
                    rag_sources=rag_info.get("sources", []),
                )

        except SecurityException:
            fallback = get_safety_fallback(user_role)

            yield await sse_message(
                "start", {"session_id": session_id or "unknown", "model": "security"}
            )

            yield await sse_message("chunk", {"content": fallback})

            yield await sse_message("done", {"session_id": session_id or "unknown"})

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")

            fallback = get_safety_fallback(user_role)

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


@router.get("/campaign-context")
async def chat_campaign_context(
    current_user: dict = Depends(get_current_user),
    campaign_repository=Depends(get_campaign_repository),
):
    user_id = current_user.get("id")
    agent_context = await resolve_agent_context(user_id, campaign_repository)
    if not agent_context:
        return {
            "has_active_campaign": False,
            "campaign_id": None,
            "campaign_name": None,
            "campaign_role": None,
            "tracking_format": {},
            "pricing_config": {},
            "platform_config": {},
        }

    return {
        "has_active_campaign": True,
        "campaign_id": agent_context.get("campaign_id"),
        "campaign_name": agent_context.get("campaign_name"),
        "campaign_role": agent_context.get("campaign_role"),
        "tracking_format": agent_context.get("campaign_data", {}).get("tracking_format") or agent_context.get("tracking_format", {}),
        "pricing_config": agent_context.get("campaign_data", {}).get("pricing_config") or agent_context.get("pricing_config", {}),
        "platform_config": agent_context.get("campaign_data", {}).get("platform_config") or agent_context.get("platform_config", {}),
    }


@router.post("/feedback")
async def submit_feedback(
    req: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        from app.infra.clients.supabase_client import SupabaseClient
        supabase = SupabaseClient().db

        resp = (
            supabase.table("agent_query_logs")
            .update({
                "feedback_rating": req.feedback_rating,
                "feedback_notes": req.feedback_notes
            })
            .eq("message_id", req.message_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        return {"status": "success", "message": "Feedback registrado"}
    except Exception as e:
        logger.error(f"Error saving feedback: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

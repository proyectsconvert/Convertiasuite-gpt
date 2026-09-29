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
from zoneinfo import ZoneInfo
from app.schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    SessionListResponse,
    SessionSummary,
    MessageDTO,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["chat-agents"])


@router.post("/agents/me")
async def get_current_agent(
    current_user: dict = Depends(get_current_user),
):
    return current_user 


@router.get("/agents/{agent_id}/chat", response_model=MessageDTO)
async def chat_with_agent(
    agent_id: str,
    chat_request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    pass

@router.get("/agents/campaign/{id}/members")
async def get_campaign_members(
    id: str,
    members: List[str] = Form(...),
    current_user: dict = Depends(get_current_user),
):
    pass

@router.get("/agents/campaign/{id}/training-insights")
async def get_campaign_training_insights(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    pass

@router.get("/agents/campaign/{id}/query-logs")
async def get_campaign_query_logs(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    pass

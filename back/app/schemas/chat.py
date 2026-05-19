from pydantic import BaseModel
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    default = "default"
    code = "code"
    vision = "vision"
    analysis = "analysis"
    reasoning = "reasoning"
    ocr = "ocr"
    medical = "medical"
    gemma_small = "gemma-small"
    gemma_medium = "gemma-medium"


class ChatRequest(BaseModel):
    message: str
    user_role: UserRole = UserRole.default
    session_id: Optional[str] = None
    has_attachment: bool = False
    extracted_context: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    model_config = {"use_enum_values": True}


class ChatResponse(BaseModel):
    response: str
    model_used: str
    session_id: str


class MessageSchema(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    attachments: Optional[list[dict]] = []


class ChatHistoryResponse(BaseModel):
    messages: list[MessageSchema]
    session_id: str


class SessionSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]

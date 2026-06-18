from pydantic import BaseModel
from typing import Optional, List
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
    extracted_context: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    model_config = {"use_enum_values": True}


class AttachmentDTO(BaseModel):
    id: Optional[str] = None
    filename: str
    type: str


class ArtifactDTO(BaseModel):
    id: Optional[str] = None
    filename: str
    type: str
    content: Optional[str] = None
    url: Optional[str] = None


class MessageDTO(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    attachments: Optional[List[AttachmentDTO]] = []
    artifacts: Optional[List[ArtifactDTO]] = []
    images: Optional[List[str]] = []


class ChatHistoryResponse(BaseModel):
    messages: List[MessageDTO]
    session_id: str


class SessionSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: List[SessionSummary]

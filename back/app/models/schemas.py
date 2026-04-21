from pydantic import BaseModel
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    default = "default"
    code = "code"
    vision = "vision"
    analysis = "analysis"
    gemma_small = "gemma-small"
    gemma_medium = "gemma-medium"
    reasoning = "reasoning"
    ocr = "ocr"
    medical = "medical"


class ChatRequest(BaseModel):
    message: str
    user_role: UserRole = UserRole.default
    session_id: Optional[str] = None
    has_attachment: bool = False

    model_config = {"use_enum_values": True}

class ChatResponse(BaseModel):
    response: str
    model_used: str
    session_id: str
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import process_chat
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/", response_model=ChatResponse)
async def send_message(request: ChatRequest):

    try:
        response, model = await process_chat(request)

        return ChatResponse(
            response=response,
            model_used=model,
            session_id=request.session_id or str(uuid.uuid4())
        )

    except Exception:
        return ChatResponse(
            response="Error procesando la solicitud",
            model_used="none",
            session_id=request.session_id or str(uuid.uuid4())
        )
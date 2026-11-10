import logging

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Query, UploadFile,
)

from app.dependencies.auth import get_current_user
from app.dependencies.voice_deps import get_voice_service, get_voice_chat_service
from app.schemas.chat import VoiceChatRequest
from app.services.voice.exceptions import (
    EmptyTranscriptError,
    GreetingError,
    TranscriptionError,
    VoiceError,
)
from app.services.voice.voice_service import VoiceService
from app.services.voice.voice_chat_service import VoiceChatService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["voice-assistant"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB


async def _read_audio(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(400, "El archivo de audio está vacío")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "El archivo de audio es demasiado grande")
    return data


@router.post("/voice/voice-stream")
@router.post("/chat/voice-stream")
async def send_voice_stream(
    request: VoiceChatRequest,
    current_user: dict = Depends(get_current_user),
    service: VoiceChatService = Depends(get_voice_chat_service),
):
    session_id = await service.handle_message(
        user_id=current_user["id"],
        user_role=current_user.get("role", "default"),
        message=request.message,
        call_id=request.call_id,
    )
    return {"status": "ok", "session_id": session_id}


@router.get("/voice/voice-greeting")
@router.get("/chat/voice-greeting")
async def voice_greeting(
    timezone: str = Query(
        "UTC", description="Zona horaria del usuario, por ejemplo 'America/New_York'"
    ),
    current_user: dict = Depends(get_current_user),
    service: VoiceService = Depends(get_voice_service),
):
    try:
        g = await service.greeting(timezone)
    except GreetingError:
        logger.exception("Error generando saludo de OlivIA")
        raise HTTPException(500, "No se pudo generar el saludo de OlivIA")

    return {
        "text": g.text,
        "audio_base64": g.audio_base64,
        "timezone": g.timezone,
        "local_time": g.local_time,
    }


@router.post("/voice/upload-audio")
@router.post("/chat/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
    call_id: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    service: VoiceService = Depends(get_voice_service),
):
    audio = await _read_audio(file)
    try:
        result = await service.process_audio_turn(
            user_id=current_user["id"],
            audio=audio,
            session_id=session_id,
            call_id=call_id,
        )
    except EmptyTranscriptError:
        return {
            "call_id": call_id,
            "transcript": "",
            "response_text": "No se pudo entender el audio.",
            "audio_base64": None,
        }
    except VoiceError:
        logger.exception("Error en el flujo de voz")
        raise HTTPException(500, "Error en el flujo de voz")

    return {
        "call_id": result.call_id,
        "transcript": result.transcript,
        "response_text": result.response_text,
        "audio_base64": result.audio_base64,
    }


@router.post("/voice/transcribe-audio")
@router.post("/chat/transcribe-audio")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: VoiceService = Depends(get_voice_service),
):
    audio = await _read_audio(file)
    try:
        transcript = await service.transcribe(audio)
    except TranscriptionError:
        logger.exception("Error al transcribir el audio")
        raise HTTPException(500, "Error al transcribir el audio")

    return {"transcript": transcript}
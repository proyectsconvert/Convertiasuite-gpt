import asyncio
import logging
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from app.dependencies.auth import get_current_user
from app.domain.entities.diarization import DiarizationResult
from app.services.audio.calls.audio_cache_service import AudioCacheService
from app.services.audio.calls.diarization_service import DiarizationService
from app.services.audio.calls.diarization_refiner import DiarizationRefinerService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sound/calls", tags=["call-transcription"])

# 100 MB para permitir llamadas completas
MAX_AUDIO_BYTES = 100 * 1024 * 1024


async def _read_audio(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El archivo de audio supera el límite permitido (100 MB)",
        )
    return data


@router.post("/audio/diarize", response_model=DiarizationResult)
@router.post("/calls/diarize", response_model=DiarizationResult)
async def diarize_call_enpoint(
    request: Request,
    file: UploadFile = File(..., description="Archivo de audio de la llamada (formato WAV o MP3)"),
    call_id: Optional[str] = Query(None, description="Identificador único de la llamada en inConcert"),
    agent_channel: int = Form(0, description="Canal del agente en audios estéreo (0=L, 1=R)"),
    current_user: dict = Depends(get_current_user),
):
    audio_bytes = await _read_audio(file)

    # Redis desde app.state
    redis_client = None
    cache_repo = getattr(request.app.state, "cache", None)
    if cache_repo and hasattr(cache_repo, "redis"):
        redis_client = cache_repo.redis

    # Instanciamos el servicio de caché
    cache_service = AudioCacheService(redis_client=redis_client)

    # NOTA: Descomentar para producción tras finalizar pruebas con este audio
    # cached_result = await cache_service.get_cached_diarization(audio_bytes)
    # if cached_result:
    #     if call_id and not cached_result.call_id:
    #         cached_result.call_id = call_id
    #     return cached_result

    # Procesar la diarización
    try:
        diarization_service = DiarizationService(agent_channel=agent_channel)
        
        result = await asyncio.to_thread(
            diarization_service.diarize_audio_bytes, audio_bytes, call_id
        )

        # Si el audio fue mono, refinamos la atribución de hablantes con OlivIA (LLM)
        if result.channel_mode == "mono_clustering" and result.turns:
            logger.info("🧠 Llamando a OlivIA (qwen2.5:7b) para refinar interlocutores...")
            refiner = DiarizationRefinerService()
            result.turns = await refiner.refine_turns(result.turns)

            # Recalcular métricas de tiempo de habla y transcript con los turnos corregidos
            result.metrics = diarization_service._calculate_metrics(
                result.turns, result.metrics.total_duration_sec
            )
            result.raw_transcript = "\n".join(
                f"[{t.speaker.value.upper()}] ({t.start_time}s - {t.end_time}s): {t.text}"
                for t in result.turns
            )
            logger.info("✅ Refinamiento de turnos completado con éxito por OlivIA.")

        # Guardar en caché el resultado refinado
        await cache_service.save_cached_diarization(audio_bytes, result)
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error al procesar la diarización: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la diarización: {type(e).__name__}: {str(e)}",
        )
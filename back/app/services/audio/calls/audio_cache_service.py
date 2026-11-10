import hashlib
import logging
from typing import Any, Optional
from app.domain.entities.diarization import DiarizationResult
logger = logging.getLogger(__name__)
class AudioCacheService:
    def __init__(self, redis_client: Optional[Any] = None, default_ttl_sec: int = 86400):

        self.redis = redis_client
        self.default_ttl = default_ttl_sec

    def compute_audio_hash(self, audio_bytes: bytes) -> str:
        return hashlib.sha256(audio_bytes).hexdigest()

    async def get_cached_diarization(self, audio_bytes: bytes) -> Optional[DiarizationResult]:
        if not self.redis:
            return None
        audio_hash = self.compute_audio_hash(audio_bytes)
        cache_key = f"diarization:cache:{audio_hash}"
        try:
            cached_json = await self.redis.get(cache_key)
            if cached_json:
                logger.info(f"[AudioCache] Hit de caché para audio {audio_hash[:8]}...")
                return DiarizationResult.model_validate_json(cached_json)
        except Exception as e:
            logger.warning(f"[AudioCache] Error consultando caché: {e}")
        return None

    async def save_cached_diarization(self, audio_bytes: bytes, diarization_result: DiarizationResult, ttl_sec: Optional[int] = None)->None:
       if not self.redis:
            return
       audio_hash = self.compute_audio_hash(audio_bytes)
       cache_key = f"diarization:cache:{audio_hash}"
       ttl = ttl_sec   or self.default_ttl

       try:
           await self.redis.set(cache_key, diarization_result.model_dump_json(), ex=ttl)
           logger.info(f"[AudioCache] Guardado en caché {audio_hash[:8]} con TTL de {ttl} segundos.")
       except Exception as e:
           logger.warning(f"[AudioCache] Error guardando en caché: {e}")
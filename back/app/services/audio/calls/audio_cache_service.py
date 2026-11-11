import hashlib
import logging
from typing import Any, Optional

from app.domain.entities.diarization import DiarizationResult

logger = logging.getLogger(__name__)

PIPELINE_VERSION = "v2-spk-cluster"


class AudioCacheService:
    def __init__(self, redis_client: Optional[Any] = None, default_ttl_sec: int = 86400):
        self.redis = redis_client
        self.default_ttl = default_ttl_sec

    def compute_audio_hash(self, audio_bytes: bytes) -> str:
        return hashlib.sha256(audio_bytes).hexdigest()

    def _cache_key(self, audio_hash: str) -> str:
        return f"diarization:{PIPELINE_VERSION}:{audio_hash}"

    async def get_cached_diarization(self, audio_bytes: bytes) -> Optional[DiarizationResult]:
        if not self.redis:
            return None
        try:
            audio_hash = self.compute_audio_hash(audio_bytes)
            cached_json = await self.redis.get(self._cache_key(audio_hash))
            if cached_json:
                logger.info(f"[AudioCache] Hit de caché para audio {audio_hash[:8]}...")
                return DiarizationResult.model_validate_json(cached_json)
        except Exception as e:
            logger.warning(f"[AudioCache] Error consultando caché: {e}")
        return None

    async def save_cached_diarization(
        self,
        audio_bytes: bytes,
        diarization_result: DiarizationResult,
        ttl_sec: Optional[int] = None,
    ) -> None:
        if not self.redis:
            return
        ttl = ttl_sec or self.default_ttl
        try:
            audio_hash = self.compute_audio_hash(audio_bytes)
            await self.redis.set(
                self._cache_key(audio_hash), diarization_result.model_dump_json(), ex=ttl
            )
            logger.info(f"[AudioCache] Guardado en caché {audio_hash[:8]} con TTL de {ttl} segundos.")
        except Exception as e:
            logger.warning(f"[AudioCache] Error guardando en caché: {e}")
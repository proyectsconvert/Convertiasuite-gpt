import os
import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class QwenTTSClient:
    def __init__(self, base_url: str = None):
        self.base_url = (base_url or get_settings().qwen_tts_url).rstrip("/")

    async def generate_speech(self, text: str, voice: str | None = None) -> bytes | None:
        """
        Sintetiza texto a audio usando Qwen TTS.
        Permite personalizar la voz usando el parámetro `voice` o la env var QWEN_TTS_VOICE.
        """
        if not text or not text.strip():
            return None

        # Voz desde parámetro o env var
        selected_voice = voice or getattr(get_settings(), "qwen_tts_voice", None) or os.getenv("QWEN_TTS_VOICE", "es_female")

        # Limpiar markdown del texto antes de enviar a TTS
        clean_text = self._clean_text_for_tts(text)
        if not clean_text:
            return None

        endpoints = [
            (f"{self.base_url}/tts", {"text": clean_text, "voice": selected_voice, "speaker": selected_voice}),
            (f"{self.base_url}/v1/audio/speech", {"input": clean_text, "model": "qwen-tts", "voice": selected_voice}),
            (f"{self.base_url}/api/tts", {"text": clean_text, "voice": selected_voice, "speaker": selected_voice}),
            (f"{self.base_url}/generate", {"prompt": clean_text, "voice": selected_voice}),
            (f"{self.base_url}/", {"text": clean_text, "voice": selected_voice}),
        ]

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for url, payload in endpoints:
                try:
                    logger.info(f"Probando Qwen TTS en: {url}")
                    response = await client.post(url, json=payload)
                    if response.status_code == 200 and len(response.content) > 100:
                        logger.info(f"✓ Audio generado exitosamente desde Qwen TTS ({len(response.content)} bytes)")
                        return response.content
                except Exception as e:
                    logger.debug(f"Endpoint {url} no respondió exitosamente: {e}")
                    continue

                # También probar con GET si POST falla
                try:
                    response = await client.get(url, params={"text": clean_text})
                    if response.status_code == 200 and len(response.content) > 100:
                        logger.info(f"✓ Audio generado exitosamente con GET en Qwen TTS ({len(response.content)} bytes)")
                        return response.content
                except Exception as e:
                    continue

        logger.warning(f"No se pudo generar audio desde Qwen TTS en {self.base_url}")
        return None

    def _clean_text_for_tts(self, text: str) -> str:
        import re
        # Eliminar bloques de código, negritas, cursivas, encabezados
        text = re.sub(r"```[\s\S]*?```", "", text)
        text = re.sub(r"`([^`]+)`", r"\1", text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
        text = re.sub(r"\*([^*]+)\*", r"\1", text)
        text = re.sub(r"#+\s*", "", text)
        text = re.sub(r"[-•]", "", text)
        text = re.sub(r"\n+", ". ", text)
        return text.strip()

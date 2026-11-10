from __future__ import annotations

import asyncio
import base64
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Awaitable, Callable

from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository

from .exceptions import (
    EmptyTranscriptError,
    GreetingError,
    TranscriptionError,
    VoicePipelineError,
)
from .greeting import build_greeting, resolve_timezone

logger = logging.getLogger(__name__)

VOICE_SYSTEM_PROMPT = (
    "Eres un asistente de voz conciso y profesional. Responde de forma clara "
    "y directa sin usar formato markdown ni viñetas, ya que tu respuesta será "
    "leída por un sintetizador de voz."
)


@dataclass(frozen=True)
class VoiceTurnResult:
    call_id: str
    transcript: str
    response_text: str
    audio_base64: str | None


@dataclass(frozen=True)
class GreetingResult:
    text: str
    audio_base64: str | None
    timezone: str
    local_time: str


class VoiceService:
    def __init__(
        self,
        *,
        transcriber: Callable[[bytes], str],
        tts_client,
        llm_provider: ILlmProvider,
        memory_repo: IMemoryRepository,
        storage: Callable[..., Awaitable[str | None]],
        model: str = "qwen2.5:7b",
        temperature: float = 0.7,
    ):
        self._transcriber = transcriber
        self._tts = tts_client
        self._llm = llm_provider
        self._memory = memory_repo
        self._storage = storage
        self._model = model
        self._temperature = temperature

    # ---------- STT ----------
    async def transcribe(self, audio: bytes) -> str:
        try:
            # Vosk es síncrono: fuera del event loop
            text = await asyncio.to_thread(self._transcriber, audio)
        except Exception as e:
            raise TranscriptionError() from e
        return (text or "").strip()

    async def _synthesize_b64(self, text: str) -> str | None:
        audio = await self._tts.generate_speech(text)
        return base64.b64encode(audio).decode("utf-8") if audio else None

    async def process_audio_turn(
        self,
        *,
        user_id: str,
        audio: bytes,
        session_id: str | None,
        call_id: str | None,
    ) -> VoiceTurnResult:
        transcript = await self.transcribe(audio)
        logger.info("[Voice] transcript='%s'", transcript)
        if not transcript:
            raise EmptyTranscriptError()

        try:
            if not call_id:
                call_id = await self._memory.create_voice_call(
                    user_id=user_id,
                    session_id=session_id,
                    title=transcript[:40],
                )
                logger.info("Voice call created id=%s user=%s", call_id, user_id)

            filename = f"voice_{uuid.uuid4()}.webm"
            audio_url = await self._storage(
                memory_repo=self._memory,
                session_id=call_id,
                filename=filename,
                file_bytes=audio,
                content_type="audio/webm",
            )

            await self._memory.save_voice_message(
                call_id=call_id,
                session_id=session_id,
                role="user",
                content=transcript,
                transcript=transcript,
                audio_path=audio_url or filename,
            )

            if hasattr(self._llm, "generate_chat"):
                response_text = await self._llm.generate_chat(
                    messages=[
                        {"role": "system", "content": VOICE_SYSTEM_PROMPT},
                        {"role": "user", "content": transcript},
                    ],
                    model=self._model,
                    temperature=self._temperature,
                )
            elif hasattr(self._llm, "client") and hasattr(self._llm.client, "generate_chat"):
                response_text = await self._llm.client.generate_chat(
                    messages=[
                        {"role": "system", "content": VOICE_SYSTEM_PROMPT},
                        {"role": "user", "content": transcript},
                    ],
                    model=self._model,
                    temperature=self._temperature,
                )
            else:
                from app.infra.clients.ollama_client import OllamaClient
                ollama = OllamaClient()
                response_text = await ollama.generate_chat(
                    messages=[
                        {"role": "system", "content": VOICE_SYSTEM_PROMPT},
                        {"role": "user", "content": transcript},
                    ],
                    model=self._model,
                    temperature=self._temperature,
                )

            await self._memory.save_voice_message(
                call_id=call_id,
                session_id=session_id,
                role="assistant",
                content=response_text,
                transcript=response_text,
            )

            audio_b64 = await self._synthesize_b64(response_text)
        except Exception as e:
            raise VoicePipelineError() from e

        return VoiceTurnResult(
            call_id=call_id,
            transcript=transcript,
            response_text=response_text,
            audio_base64=audio_b64,
        )

    async def greeting(self, timezone: str) -> GreetingResult:
        try:
            now = datetime.now(resolve_timezone(timezone))
            text = build_greeting(now)
            logger.info("[voice-greeting] tz=%s hour=%s", timezone, now.hour)
            return GreetingResult(
                text=text,
                audio_base64=await self._synthesize_b64(text),
                timezone=timezone,
                local_time=now.isoformat(),
            )
        except Exception as e:
            raise GreetingError() from e
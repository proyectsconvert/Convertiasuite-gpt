import os
import sys
import unittest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from zoneinfo import ZoneInfo

# Add back dir to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.audio.voice_assistant.greeting import build_greeting, resolve_timezone
from app.services.audio.voice_assistant.exceptions import (
    VoiceError,
    EmptyTranscriptError,
    TranscriptionError,
    GreetingError,
    VoicePipelineError,
)
from app.services.audio.voice_assistant.voice_assistant_service import (
    VoiceService,
    VoiceTurnResult,
    GreetingResult,
)


class TestVoiceGreeting(unittest.TestCase):
    def test_greeting_morning(self):
        dt = datetime(2026, 11, 7, 8, 30)
        text = build_greeting(dt)
        self.assertIn("Buenos días", text)

    def test_greeting_afternoon(self):
        dt = datetime(2026, 11, 7, 14, 0)
        text = build_greeting(dt)
        self.assertIn("Buenas tardes", text)

    def test_greeting_night(self):
        dt = datetime(2026, 11, 7, 21, 0)
        text = build_greeting(dt)
        self.assertIn("Buenas noches", text)

    def test_resolve_timezone_valid(self):
        tz = resolve_timezone("UTC")
        now = datetime.now(tz)
        self.assertIsNotNone(now)

    def test_resolve_timezone_invalid_falls_back_to_utc(self):
        tz = resolve_timezone("Invalid/Timezone_12345")
        now = datetime.now(tz)
        self.assertIsNotNone(now)


class TestVoiceService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mock_transcriber = MagicMock(return_value="hola olivIA")
        self.mock_tts = MagicMock()
        self.mock_tts.generate_speech = AsyncMock(return_value=b"fake-audio-bytes")
        self.mock_llm = MagicMock()
        self.mock_llm.generate_chat = AsyncMock(return_value="Hola, ¿en qué te ayudo?")
        self.mock_memory = MagicMock()
        self.mock_memory.create_voice_call = AsyncMock(return_value="call-123")
        self.mock_memory.save_voice_message = AsyncMock()
        self.mock_storage = AsyncMock(return_value="https://storage.supabase.co/audio.webm")

        self.service = VoiceService(
            transcriber=self.mock_transcriber,
            tts_client=self.mock_tts,
            llm_provider=self.mock_llm,
            memory_repo=self.mock_memory,
            storage=self.mock_storage,
        )

    async def test_transcribe_success(self):
        text = await self.service.transcribe(b"dummy_bytes")
        self.assertEqual(text, "hola olivIA")
        self.mock_transcriber.assert_called_once_with(b"dummy_bytes")

    async def test_transcribe_failure_raises_transcription_error(self):
        self.mock_transcriber.side_effect = Exception("FFmpeg crash")
        with self.assertRaises(TranscriptionError):
            await self.service.transcribe(b"dummy_bytes")

    async def test_greeting_success(self):
        result = await self.service.greeting("UTC")
        self.assertIsInstance(result, GreetingResult)
        self.assertIsNotNone(result.audio_base64)
        self.mock_tts.generate_speech.assert_awaited_once()

    async def test_process_audio_turn_empty_transcript_raises(self):
        self.mock_transcriber.return_value = ""
        with self.assertRaises(EmptyTranscriptError):
            await self.service.process_audio_turn(
                user_id="user-1",
                audio=b"empty_audio",
                session_id=None,
                call_id=None,
            )

    async def test_process_audio_turn_full_pipeline(self):
        result = await self.service.process_audio_turn(
            user_id="user-1",
            audio=b"valid_audio",
            session_id="session-1",
            call_id=None,
        )
        self.assertIsInstance(result, VoiceTurnResult)
        self.assertEqual(result.call_id, "call-123")
        self.assertEqual(result.transcript, "hola olivIA")
        self.assertEqual(result.response_text, "Hola, ¿en qué te ayudo?")
        self.assertIsNotNone(result.audio_base64)

        # Verificamos que se guardaron los mensajes de usuario y asistente
        self.assertEqual(self.mock_memory.save_voice_message.await_count, 2)


if __name__ == "__main__":
    unittest.main()

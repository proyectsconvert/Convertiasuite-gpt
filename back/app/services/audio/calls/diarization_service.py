import logging
import os
import subprocess
import tempfile
import wave
from typing import List, Tuple

from app.domain.entities.diarization import (
    DiarizationResult,
    DiarizationMetrics,
    DiarizedTurn,
    WordTimestamp,
)
from app.domain.enums.speaker import SpeakerRole
from app.services.audio.calls.transcription_service import transcribe_words_from_wav
from app.services.audio.calls.audio_cleaner_service import AudioCleanerService

logger = logging.getLogger(__name__)


class DiarizationService:
    def __init__(self, agent_channel: int = 0, max_pause_seconds: float = 1.0):
        self.agent_channel = agent_channel
        self.max_pause_seconds = max_pause_seconds

    def _probe_audio(self, file_path: str) -> Tuple[int, float]:
        try:
            with wave.open(file_path, "rb") as wf:
                framerate = wf.getframerate()
                nframes = wf.getnframes()
                duration = nframes / float(framerate) if framerate > 0 else 0.0
                return wf.getnchannels(), duration
        except Exception:
            pass

        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "stream=channels,duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ]
        try:
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().splitlines()
            channels = int(output[0]) if len(output) > 0 else 1
            duration = float(output[1]) if len(output) > 1 else 0.0
            return channels, duration
        except Exception as e:
            logger.error(f"Error al obtener información de audio con ffprobe: {e}. Asumiendo canal por defecto (mono).")
            return 1, 0.0

    def _extract_channel(self, input_path: str, channel_idx: int) -> str:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", f"pan=mono|c0=c{channel_idx}",
            "-ar", "16000",
            output_path,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path

    def _convert_to_mono_wav(self, input_path: str) -> str:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", "16000",
            output_path,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path

    def _group_words_into_turns(
        self, words: List[WordTimestamp], speaker: SpeakerRole
    ) -> List[DiarizedTurn]:
        if not words:
            return []

        turns: List[DiarizedTurn] = []
        current_words: List[WordTimestamp] = [words[0]]

        for word in words[1:]:
            pause = word.start - current_words[-1].end
            if pause > self.max_pause_seconds:
                turns.append(
                    DiarizedTurn(
                        speaker=speaker,
                        start_time=round(current_words[0].start, 2),
                        end_time=round(current_words[-1].end, 2),
                        text=" ".join(w.word for w in current_words),
                        words=list(current_words),
                    )
                )
                current_words = [word]
            else:
                current_words.append(word)

        if current_words:
            turns.append(
                DiarizedTurn(
                    speaker=speaker,
                    start_time=round(current_words[0].start, 2),
                    end_time=round(current_words[-1].end, 2),
                    text=" ".join(w.word for w in current_words),
                    words=list(current_words),
                )
            )
        return turns

    def _calculate_metrics(
        self, turns: List[DiarizedTurn], total_duration: float
    ) -> DiarizationMetrics:
        agent_time = sum(
            t.end_time - t.start_time for t in turns if t.speaker == SpeakerRole.AGENT
        )
        customer_time = sum(
            t.end_time - t.start_time for t in turns if t.speaker == SpeakerRole.CUSTOMER
        )
        calc_duration = max(total_duration, (turns[-1].end_time if turns else 0.0), 0.01)
        total_talk = agent_time + customer_time
        silence_time = max(0.0, calc_duration - total_talk)

        return DiarizationMetrics(
            total_duration_sec=round(calc_duration, 2),
            agent_talk_time_sec=round(agent_time, 2),
            customer_talk_time_sec=round(customer_time, 2),
            agent_talk_ratio=round((agent_time / calc_duration) * 100, 2),
            customer_talk_ratio=round((customer_time / calc_duration) * 100, 2),
            silence_time_sec=round(silence_time, 2),
        )

    def diarize_audio_bytes(
        self, audio_bytes: bytes, call_id: str | None = None
    ) -> DiarizationResult:
        audio_bytes = AudioCleanerService.clean_audio_bytes(audio_bytes)
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".audio")
        temp_input.write(audio_bytes)
        temp_input.close()
        extracted_files = [temp_input.name]

        try:
            channels, duration = self._probe_audio(temp_input.name)
            turns: List[DiarizedTurn] = []

            if channels >= 2:
                mode = "stereo_split"
                customer_ch = 1 if self.agent_channel == 0 else 0
                agent_wav = self._extract_channel(temp_input.name, self.agent_channel)
                customer_wav = self._extract_channel(temp_input.name, customer_ch)
                extracted_files.extend([agent_wav, customer_wav])

                agent_words = transcribe_words_from_wav(agent_wav)
                customer_words = transcribe_words_from_wav(customer_wav)

                agent_turns = self._group_words_into_turns(agent_words, SpeakerRole.AGENT)
                customer_turns = self._group_words_into_turns(customer_words, SpeakerRole.CUSTOMER)

                turns = sorted(agent_turns + customer_turns, key=lambda t: t.start_time)
            else:
                mode = "mono_clustering"
                mono_wav = self._convert_to_mono_wav(temp_input.name)
                extracted_files.append(mono_wav)

                words = transcribe_words_from_wav(mono_wav)
                raw_turns = self._group_words_into_turns(words, SpeakerRole.AGENT)

                for idx, t in enumerate(raw_turns):
                    t.speaker = SpeakerRole.AGENT if idx % 2 == 0 else SpeakerRole.CUSTOMER
                turns = raw_turns

            metrics = self._calculate_metrics(turns, duration)
            raw_text = "\n".join(
                f"[{t.speaker.value.upper()}] ({t.start_time}s - {t.end_time}s): {t.text}"
                for t in turns
            )

            return DiarizationResult(
                call_id=call_id,
                channel_mode=mode,
                turns=turns,
                metrics=metrics,
                raw_transcript=raw_text,
            )
        finally:
            for p in extracted_files:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass

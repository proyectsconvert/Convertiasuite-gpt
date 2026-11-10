import io
import json
import logging
import os
import subprocess
import tempfile
import wave
from typing import List
from vosk import KaldiRecognizer

from app.domain.entities.diarization import WordTimestamp
from app.infra.clients.vosk_client import VoskModelManager

logger = logging.getLogger(__name__)


def transcribe_words_from_wav(wav_path: str) -> List[WordTimestamp]:
    model = VoskModelManager.get_model()
    words: List[WordTimestamp] = []

    with wave.open(wav_path, "rb") as wf:
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                res = json.loads(rec.Result())
                for w in res.get("result", []):
                    words.append(
                        WordTimestamp(
                            word=w["word"],
                            start=w["start"],
                            end=w["end"],
                            confidence=w.get("conf", 1.0),
                        )
                    )

        final_res = json.loads(rec.FinalResult())
        for w in final_res.get("result", []):
            words.append(
                WordTimestamp(
                    word=w["word"],
                    start=w["start"],
                    end=w["end"],
                    confidence=w.get("conf", 1.0),
                )
            )

    return words


def transcribe_audio(audio_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_in:
        temp_in.write(audio_bytes)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path + ".wav"

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", temp_in_path,
            "-ac", "1",
            "-ar", "16000",
            temp_out_path,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=15)

        words = transcribe_words_from_wav(temp_out_path)
        return " ".join(w.word for w in words)

    except subprocess.CalledProcessError as e:
        stderr_msg = e.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(f"Error en conversión de audio FFmpeg: {stderr_msg}") from e
    finally:
        for p in (temp_in_path, temp_out_path):
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
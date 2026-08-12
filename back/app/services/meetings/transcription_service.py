import os
import json
import wave
import io
import subprocess
import tempfile
import logging
import shutil

from vosk import Model, KaldiRecognizer

logger = logging.getLogger(__name__)

_model = None


def get_model() -> Model:
    global _model
    if _model is None:
        # Priority: env var > Docker path > local relative path
        candidates = [
            os.environ.get("VOSK_MODEL_PATH", ""),
            "/opt/vosk-models/vosk-model-es-0.42",
            "/opt/vosk-models/vosk-model-small-es-0.42",
            os.path.normpath(
                os.path.join(
                    os.path.dirname(__file__), "..", "vosk_models", "vosk-model-small-es-0.42"
                )
            ),
            os.path.normpath(
                os.path.join(
                    os.path.dirname(__file__), "..", "vosk_models", "vosk-model-small-es-0.42"
                )
            ),
        ]
        model_path = None
        for path in candidates:
            if path and os.path.exists(path):
                model_path = path
                break

        if model_path is None:
            searched = ", ".join(p for p in candidates if p)
            raise FileNotFoundError(
                f"Vosk model not found. Searched: {searched}"
            )

        logger.info(f"Loading Vosk model from: {model_path}")
        _model = Model(model_path)
        logger.info("Vosk model loaded successfully.")
    return _model


def transcribe_audio(audio_bytes: bytes) -> str:

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_in:
        temp_in.write(audio_bytes)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path + ".wav"

    try:
        
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            temp_in_path,
            "-ac",
            "1",
            "-ar",
            "16000",
            temp_out_path,
        ]

        logger.info(f"Converting audio using FFmpeg: {temp_in_path} -> {temp_out_path}")
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=15
        )

        with open(temp_out_path, "rb") as f:
            wav_data = f.read()

    except subprocess.CalledProcessError as e:
        stderr_msg = e.stderr.decode("utf-8", errors="ignore")
        logger.error(f"FFmpeg audio conversion failed: {stderr_msg}")
        raise RuntimeError(f"Error en conversión de audio FFmpeg: {stderr_msg}") from e
    finally:
        # Proactively clean up temp files
        for p in (temp_in_path, temp_out_path):
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception as ex:
                logger.warning(f"Could not delete temporary audio file {p}: {ex}")

    model = get_model()

    # Open WAV from bytes in memory
    try:
        wf = wave.open(io.BytesIO(wav_data), "rb")
        if (
            wf.getnchannels() != 1
            or wf.getsampwidth() != 2
            or wf.getcomptype() != "NONE"
        ):
            raise ValueError(
                "El archivo convertido no cumple con el formato PCM mono WAV de Vosk."
            )

        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(False)

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            rec.AcceptWaveform(data)

        res = json.loads(rec.FinalResult())
        transcript = res.get("text", "")
        logger.info(f"Audio transcription completed: {transcript}")
        return transcript

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise

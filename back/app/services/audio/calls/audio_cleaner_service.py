import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)


class AudioCleanerService:
    @staticmethod
    def clean_audio_file(input_path: str, output_path: str | None = None) -> str:
        if not output_path:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                output_path = tmp.name

        # Cadena de filtros optimizada para telefonía
        audio_filters = (
            "highpass=f=120,"
            "lowpass=f=7500,"
            "afftdn=nf=-25:nr=15,"
            "dynaudnorm=f=150:g=15:p=0.9"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", audio_filters,
            "-ar", "16000",
            output_path,
        ]

        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Error limpiando audio con FFmpeg: {e.stderr.decode('utf-8', errors='ignore')}")
            return input_path

    @classmethod
    def clean_audio_bytes(cls, audio_bytes: bytes) -> bytes:
        """Limpia audio recibido en bytes y retorna el WAV limpio en bytes."""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as temp_in:
            temp_in.write(audio_bytes)
            temp_in_path = temp_in.name

        cleaned_wav = cls.clean_audio_file(temp_in_path)

        try:
            with open(cleaned_wav, "rb") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error leyendo audio limpio: {e}")
            return audio_bytes
        finally:
            for p in {temp_in_path, cleaned_wav}:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass

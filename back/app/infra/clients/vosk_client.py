import os 
import logging 
from pathlib import Path
from vosk import Model, SpkModel

logger = logging.getLogger(__name__)


class VoskModelManager:
    _instance: Model | None = None
    _spk_model: SpkModel | None = None

    @classmethod
    def get_model(cls) -> Model:
        if cls._instance is None:
            candidates = [
                os.environ.get("VOSK_MODEL_PATH", ""),
                "/opt/vosk-models/vosk-model-es-0.42",
                "/app/app/vosk_models/vosk-model-es-0.42",
                "/app/vosk_models/vosk-model-es-0.42",
                str(Path(__file__).resolve().parents[2] / "vosk_models" / "vosk-model-es-0.42"),
                "/opt/vosk-models/vosk-model-small-es-0.42",
                "/app/app/vosk_models/vosk-model-small-es-0.42",
                str(Path(__file__).resolve().parents[2] / "vosk_models" / "vosk-model-small-es-0.42"),
            ]
            model_path = next((p for p in candidates if p and os.path.exists(p)), None)

            if not model_path:
                searched = ", ".join(p for p in candidates if p)
                raise FileNotFoundError(f"Vosk model not found. Searched: {searched}")

            logger.info(f"Cargando modelo Vosk en memoria desde: {model_path} ...")
            cls._instance = Model(model_path)
            logger.info("Modelo Vosk cargado exitosamente en memoria.")
        return cls._instance

    @classmethod
    def get_spk_model(cls) -> SpkModel | None:
        if cls._spk_model is None:
            candidates = [
                os.environ.get("VOSK_SPK_MODEL_PATH", ""),
                "/opt/vosk-models/vosk-model-spk-0.4",
                "/app/app/vosk_models/vosk-model-spk-0.4",
                "/app/vosk_models/vosk-model-spk-0.4",
                str(Path(__file__).resolve().parents[2] / "vosk_models" / "vosk-model-spk-0.4"),
            ]
            model_path = next((p for p in candidates if p and os.path.exists(p)), None)
            if not model_path:
                logger.warning("Vosk speaker model not found. Mono audio will use phonetic transcription.")
                return None

            logger.info(f"Cargando modelo de hablante Vosk desde: {model_path} ...")
            cls._spk_model = SpkModel(model_path)
            logger.info("Modelo de hablante Vosk cargado exitosamente.")
        return cls._spk_model

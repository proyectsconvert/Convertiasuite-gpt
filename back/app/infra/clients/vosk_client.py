import os 
import logging 
from pathlib import Path
from vosk import Model

logger = logging.getLogger(__name__)


class VoskModelManager:
    _instance: Model | None = None

    @classmethod
    def get_model(cls) -> Model:
        if cls._instance is None:
            candidates = [
                os.environ.get("VOSK_MODEL_PATH", ""),
                "/opt/vosk-models/vosk-model-es-0.42",
                "/opt/vosk-models/vosk-model-small-es-0.42",
                str(Path(__file__).parents[2] / "vosk_models" / "vosk-model-es-0.42"),
                str(Path(__file__).parents[2] / "vosk_models" / "vosk-model-small-es-0.42"),
            ]
            model_path = next((p for p in candidates if p and os.path.exists(p)), None)

            if not model_path:
                searched = ", ".join(p for p in candidates if p)
                raise FileNotFoundError(f"Vosk model not found. Searched: {searched}")

            logger.info(f"Cargando modelo Vosk en memoria desde: {model_path} ...")
            cls._instance = Model(model_path)
            logger.info("Modelo Vosk cargado exitosamente en memoria.")

        return cls._instance
import json
import logging
from typing import List

from app.domain.entities.diarization import DiarizedTurn
from app.domain.enums.speaker import SpeakerRole
from app.infra.clients.ollama_client import OllamaClient
from app.services.prompts.operations.diarization_prompt import build_diarization_refiner_messages

logger = logging.getLogger(__name__)


class DiarizationRefinerService:
    """Refina la asignación de interlocutores usando el modelo local de OlivIA."""

    def __init__(self, ollama_client: OllamaClient | None = None, model: str = "qwen2.5:7b"):
        self.ollama = ollama_client or OllamaClient()
        self.model = model

    async def refine_turns(self, turns: List[DiarizedTurn]) -> List[DiarizedTurn]:
        """Envía los turnos a OlivIA para corregir la atribución de hablante y ortografía."""
        if not turns:
            return turns

        payload = [
            {"index": i, "speaker": t.speaker.value, "text": t.text}
            for i, t in enumerate(turns)
        ]
        payload_str = json.dumps(payload, ensure_ascii=False)

        # Usamos el constructor de mensajes de la capa de prompts
        messages = build_diarization_refiner_messages(payload_str)

        try:
            logger.info(f"[DiarizationRefiner] Enviando {len(turns)} turnos a OlivIA ({self.model})...")
            response = await self.ollama.generate_chat(
                messages=messages,
                model=self.model,
                temperature=0.1,
            )

            clean_text = response.strip()
            # Extraer solo el array JSON [...]
            if "[" in clean_text and "]" in clean_text:
                start_idx = clean_text.find("[")
                end_idx = clean_text.rfind("]") + 1
                clean_text = clean_text[start_idx:end_idx]

            refined_data = json.loads(clean_text)

            for item in refined_data:
                idx = item.get("index")
                if idx is not None and 0 <= idx < len(turns):
                    new_speaker = item.get("speaker", "").lower()
                    if new_speaker in ("agent", "customer"):
                        turns[idx].speaker = (
                            SpeakerRole.AGENT if new_speaker == "agent" else SpeakerRole.CUSTOMER
                        )
                    if item.get("text"):
                        turns[idx].text = item.get("text")

            logger.info("[DiarizationRefiner] Turnos refinados contextualmente por OlivIA exitosamente.")
            return turns

        except Exception as e:
            logger.warning(
                f"[DiarizationRefiner] Falló el refinamiento con LLM ({e}). Se conservan los turnos originales.",
                exc_info=True,
            )
            return turns

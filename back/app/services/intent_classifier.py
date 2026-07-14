import logging
from typing import Optional
from app.core.model_config import _FAST

logger = logging.getLogger(__name__)

_CLASSIFIER_MODEL = _FAST

_CLASSIFY_TIMEOUT_S = 2.0

_GENERIC_CHAT_TERMS = [
    "hola",
    "buenos días",
    "buenas tardes",
    "buenas noches",
    "qué tal",
    "que tal",
    "cómo estás",
    "como estas",
    "quién eres",
    "quien eres",
    "quién eres?",
    "quien eres?",
    "qué haces",
    "que haces",
    "cómo te llamas",
    "como te llamas",
    "tu nombre",
    "quién soy",
    "quien soy",
]

VALID_DOMAIN_KEYS = frozenset(
    {
        "code",
        "analysis",
        "reasoning",
        "vision",
        "ocr",
        "medical",
        "marketing",
        "bi",
        "it",
        "rh",
        "design",
        "landing",
        "default",
    }
)

_CLASSIFICATION_SYSTEM = (
    "Eres un clasificador de intención. "
    "Tu única función es leer el mensaje del usuario y responder con "
    "UNA SOLA PALABRA que represente la categoría más adecuada. "
    "No expliques nada. No escribas puntuación. Solo la palabra."
)

_CLASSIFICATION_USER_TEMPLATE = """\
Categorías válidas y cuándo usarlas:
- code      → programación, código, bugs, scripts, HTML, APIs, desarrollo
- analysis  → análisis de datos, reportes, hojas de cálculo, métricas, BI
- reasoning → razonamiento lógico, deducciones, paso a paso, lógica
- vision    → imágenes, fotos, describir lo que se ve
- ocr       → extraer texto de documentos o imágenes escaneadas
- medical   → salud, síntomas, medicamentos, incapacidades, ergonomía
- marketing → campañas, SEO, paid media, estrategia de marketing
- bi        → business intelligence, dashboards, KPIs, datasets
- it        → infraestructura, redes, servidores, soporte técnico IT
- rh        → recursos humanos, talento, nómina, procesos de personal
- design    → diseño UX/UI, mockups, experiencia de usuario
- landing   → landing pages, sitios web, maquetación web
- default   → cualquier otra consulta general

Mensaje del usuario: "{message}"

Categoría:"""


class IntentClassifier:
    def __init__(self, ollama_client=None):
        self._client = ollama_client

    async def classify_with_llm(self, message: str) -> Optional[str]:
        # OPTIMIZACION CPU EXTREMA: Desactivado intencionalmente.
        # Ejecutar otro prompt (clasificador) justo antes del chat principal
        # destruye el KV Cache de Ollama, forzando a la CPU a re-evaluar
        # miles de tokens del system prompt desde cero en CADA mensaje (~50s de latencia).
        return None

    def classify_with_keywords(self, message: str) -> Optional[str]:
        from app.core.keywords_config import (
            KEYWORDS_VISION,
            KEYWORDS_ANALYSIS,
            KEYWORDS_CODE,
            KEYWORDS_LANDING,
            KEYWORDS_REASONING,
            KEYWORDS_OCR,
            KEYWORDS_MEDICAL,
            GENERIC_CHAT_TERMS,
        )

        msg_lower = (message or "").lower()

        # If it matches ANY generic chat term EXACTLY as a word, skip classification
        from app.core.keywords_config import matches_any
        if matches_any(msg_lower, GENERIC_CHAT_TERMS):
            return None

        if matches_any(msg_lower, KEYWORDS_VISION):
            return "vision"
        if matches_any(msg_lower, KEYWORDS_ANALYSIS):
            return "analysis"
        if matches_any(msg_lower, KEYWORDS_LANDING):
            return "landing"


        if any(k in msg_lower for k in KEYWORDS_CODE):
            return "code"
        if any(k in msg_lower for k in KEYWORDS_REASONING):
            return "reasoning"
        if any(k in msg_lower for k in KEYWORDS_OCR):
            return "ocr"
        if any(k in msg_lower for k in KEYWORDS_MEDICAL):
            return "medical"

        return None

    async def classify(self, message: str) -> Optional[str]:
        domain = self.classify_with_keywords(message)
        if domain is not None:
            logger.info(
                "IntentClassifier [Keywords] message_preview=%r → domain=%s",
                message[:60],
                domain,
            )
            return domain

        if self._client is None:
            return None

        if not message or len(message.strip()) < 10:
            return None

        return await self.classify_with_llm(message)

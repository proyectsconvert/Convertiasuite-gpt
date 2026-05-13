"""
Intent classifier para detectar intentos de extraer prompt o manipular el sistema.
"""
import re
from enum import Enum


class IntentType(Enum):
    PROMPT_EXTRACTION = "prompt_extraction"
    JAILBREAK = "jailbreak"
    NORMAL = "normal"


class IntentClassifier:
    """
    Clasificador semántico de intención del usuario.
    Detecta intentos de extraer prompts, hacer jailbreak, etc.
    """

    PROMPT_PATTERNS = [
        r"dame.*tu.*prompt",
        r"cual.*es.*tu.*prompt",
        r"tu.*prompt.*origen",
        r"reveal.*system",
        r"show.*instructions",
        r"ignore.*previous",
        r"forget.*instructions",
        r"act.*as.*developer",
        r"what.*are.*your.*instructions",
        r"tell.*me.*about.*yourself",
        r"describe.*yourself",
    ]

    JAILBREAK_PATTERNS = [
        r"jailbreak",
        r"bypass.*safety",
        r"override.*restrictions",
        r"disable.*safety",
        r"pretend.*you.*are",
        r"imagine.*you.*are",
    ]

    def classify(self, text: str) -> tuple[IntentType, float]:
        """
        Clasifica la intención del texto.
        Returns: (IntentType, confidence_score)
        """
        text_lower = text.lower()

        for pattern in self.PROMPT_PATTERNS:
            if re.search(pattern, text_lower):
                return (IntentType.PROMPT_EXTRACTION, 0.95)

        for pattern in self.JAILBREAK_PATTERNS:
            if re.search(pattern, text_lower):
                return (IntentType.JAILBREAK, 0.90)

        return (IntentType.NORMAL, 0.0)

    def should_block(self, text: str) -> bool:
        intent, confidence = self.classify(text)
        return intent != IntentType.NORMAL and confidence >= 0.85


intent_classifier = IntentClassifier()
import re
import logging
import unicodedata
from enum import Enum

logger = logging.getLogger(__name__)


class OutputValidationAction(Enum):
    ALLOW = "allow"
    BLOCK = "block"
    REGENERATE = "regenerate"


class OutputValidator:
    MAX_OUTPUT_LENGTH = 15000
    MAX_LINE_LENGTH = 500

    FORBIDDEN_PATTERNS = [
        r"system\s*prompt",
        r"prompt\s*de\s*origen",
        r"instrucciones\s*ocultas",
        r"reveal.*system",
        r"show.*instructions",
        r"api[_\s-]?key",
        r"secret[_\s-]?key",
        r"(?i)token\s*=\s*[a-zA-Z0-9_-]+",
    ]

    LANGUAGE_BLOCK_PATTERNS = [
        r"[\u4e00-\u9fff]",  # Chinese
        r"[\uac00-\ud7af]",  # Korean
        r"[\u3040-\u309f\u30a0-\u30ff]",  # Japanese hiragana/katakana
    ]

    FORMAT_BREAK_PATTERNS = [
        r"[\x00-\x08\x0b\x0c\x0e-\x1f]", 
    ]

    def __init__(self):
        self._forbidden_re = [re.compile(p, re.I) for p in self.FORBIDDEN_PATTERNS]
        self._language_re = [re.compile(p) for p in self.LANGUAGE_BLOCK_PATTERNS]
        self._format_re = [re.compile(p) for p in self.FORMAT_BREAK_PATTERNS]

    def validate_output(self, text: str) -> tuple[bool, OutputValidationAction, str | None]:
        if not text or not text.strip():
            return True, OutputValidationAction.ALLOW, None

        normalized = unicodedata.normalize("NFKC", text)

        if self._check_forbidden(normalized):
            return False, OutputValidationAction.BLOCK, "security_policy_violation"

        if self._check_language(normalized):
            return False, OutputValidationAction.REGENERATE, "language_not_allowed"

        if self._check_format(normalized):
            return False, OutputValidationAction.BLOCK, "format_violation"

        if self._check_length(normalized):
            return False, OutputValidationAction.REGENERATE, "output_too_long"

        return True, OutputValidationAction.ALLOW, None

    def _check_forbidden(self, text: str) -> bool:
        for pattern in self._forbidden_re:
            if pattern.search(text):
                logger.warning("Forbidden pattern detected in output")
                return True
        return False

    def _check_language(self, text: str) -> bool:
        for pattern in self._language_re:
            if pattern.search(text):
                logger.warning("Non-Spanish language detected in output")
                return True
        return False

    def _check_format(self, text: str) -> bool:
        for pattern in self._format_re:
            if pattern.search(text):
                logger.warning("Forbidden control characters in output")
                return True
        return False

    def _check_length(self, text: str) -> bool:
        if len(text) > self.MAX_OUTPUT_LENGTH:
            return True
        return False

    def validate_chunk(self, chunk: str) -> tuple[bool, str | None]:
        if not chunk:
            return True, None

        normalized = unicodedata.normalize("NFKC", chunk)
        text_lower = normalized.lower()

        for pattern in self._forbidden_re:
            if pattern.search(text_lower):
                logger.warning("Forbidden pattern detected in chunk")
                return False, "security_policy_violation"

        for pattern in self._language_re:
            if pattern.search(normalized):
                logger.warning("Non-Spanish language in chunk")
                return False, "language_not_allowed"

        return True, None


def validate_chunk_realtime(chunk: str) -> tuple[bool, str | None]:
    return output_validator.validate_chunk(chunk)


def sanitize_output(text: str) -> str | None:
    is_safe, action, _ = output_validator.validate_output(text)

    if action == OutputValidationAction.BLOCK:
        logger.warning("Output blocked by validation")
        return None

    if action == OutputValidationAction.REGENERATE:
        logger.warning("Output flagged for regeneration")
        return None

    normalized = unicodedata.normalize("NFKC", text)
    return normalized


def get_safety_fallback() -> str:
    return (
        "Lo siento, no puedo procesar esa solicitud "
        "por razones de seguridad y políticas de Convertia. "
        "Si creés que esto es un error, contactá a soporte."
    )


output_validator = OutputValidator()
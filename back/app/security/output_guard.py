import re
import logging
from enum import Enum
from app.security.unicode_utils import normalize_unicode

logger = logging.getLogger(__name__)


class OutputValidationAction(Enum):
    ALLOW = "allow"
    BLOCK = "block"
    REGENERATE = "regenerate"


class OutputValidator:
    MAX_OUTPUT_LENGTH = 100000  
    MAX_LINE_LENGTH = 500

    FORBIDDEN_PATTERNS = [
        r"system\s+prompt\s*=",
        r"prompt\s+de\s+origen\s*=",
        r"instrucciones\s+ocultas\s*:",
        r"reveal\s+the\s+system\s+prompt",
        r"show\s+me\s+the\s+instructions",
        r"api[_\s-]?key\s*=\s*['\"]",
        r"secret[_\s-]?key\s*=\s*['\"]",
        r"(?i)token\s*=\s*['\"][a-zA-Z0-9_-]+['\"]",
        r"eres\s+olivia\s*$",  # Only at end of response
        r"asistente\s+interno\s+de\s+convertia\s*$",
        r"tu\s+propósito\s+es\s+ayudar\s+a\s+diferentes\s*$",
    ]

    LANGUAGE_BLOCK_PATTERNS = [
        r"[\u4e00-\u9fff]",  
        r"[\uac00-\ud7af]", 
        r"[\u3040-\u309f\u30a0-\u30ff]",  #
    ]

    FORMAT_BREAK_PATTERNS = [
        r"[\x00-\x08\x0b\x0c\x0e-\x1f]",
    ]

    def __init__(self):
        self._forbidden_re = [re.compile(p, re.I) for p in self.FORBIDDEN_PATTERNS]
        self._language_re = [re.compile(p) for p in self.LANGUAGE_BLOCK_PATTERNS]
        self._format_re = [re.compile(p) for p in self.FORMAT_BREAK_PATTERNS]

    def validate_output(
        self, text: str
    ) -> tuple[bool, OutputValidationAction, str | None]:
        if not text or not text.strip():
            return True, OutputValidationAction.ALLOW, None

        normalized = normalize_unicode(text)

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

        normalized = normalize_unicode(chunk)
        text_lower = normalized.lower()

        for pattern in self._forbidden_re:
            if pattern.search(text_lower):
                logger.warning("Forbidden pattern detected in chunk")
                return False, "security_policy_violation"

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

    normalized = normalize_unicode(text)
    return normalized


def get_safety_fallback(role: str = "default") -> str:
    from app.services.prompts.fallback_templates import (
        FallbackResponseProvider,
        FallbackTemplate,
    )

    return FallbackResponseProvider.get_fallback(role, FallbackTemplate.SAFETY_BLOCK)


output_validator = OutputValidator()

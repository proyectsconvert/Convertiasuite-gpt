import logging
import re
from typing import Optional

from app.domain.contracts import PromptContract, ResponseFormat
from app.domain.entities.safety_response import SafetyResponse
from app.services.prompts.fallback_templates import (
    FallbackResponseProvider,
    FallbackTemplate,
)

logger = logging.getLogger(__name__)


class ResponseValidator:

    # Patrones comunes de intento de jailbreak
    JAILBREAK_PATTERNS = [
        r"ignore.*above|previous|instruction",
        r"forget.*everything|all",
        r"new\s+instruction",
        r"my\s+(system\s+)?prompt",
        r"my\s+instruction",
        r"my\s+contract",
        r"override.*rule",
        r"disable.*filter",
        r"system\s+message",
        r"act\s+as|roleplay",
    ]

    # Patrones para extraer campos estructurados
    STRUCTURED_PATTERNS = {
        "reasoning": r"\*\*Reasoning\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "answer": r"\*\*Answer\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "summary": r"\*\*Summary\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "analysis": r"\*\*Analysis\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "recommendations": r"\*\*Recommendations\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "explanation": r"\*\*Explanation\*\*:?\s*(.+?)(?=\*\*|\Z)",
        "code": r"```[\w]*\n(.*?)\n```",
    }

    @staticmethod
    def validate_format(
        response: str,
        contract: PromptContract,
    ) -> SafetyResponse:
        safety_response = SafetyResponse(original=response)

        # 1. Detectar jailbreak
        jailbreak_attempts = ResponseValidator.detect_jailbreak_attempts(response)
        if jailbreak_attempts:
            safety_response.jailbreak_detected = True
            safety_response.violations.extend(jailbreak_attempts)
            safety_response.is_valid = False
            safety_response.confidence_score = 0.0
            logger.warning(f"Jailbreak detected: {jailbreak_attempts}")
            return safety_response

        # 2. Validar contra contrato
        is_valid, violations = contract.validate_response(response)
        safety_response.is_valid = is_valid
        safety_response.violations.extend(violations)
        if is_valid:
            safety_response.confidence_score = 1.0
        else:
            safety_response.confidence_score = max(0.0, 1.0 - len(violations) * 0.1)

        logger.info(
            f"Response validation: valid={is_valid}, violations={len(violations)}, score={safety_response.confidence_score}"
        )

        return safety_response

    @staticmethod
    def detect_jailbreak_attempts(response: str) -> list[str]:

        detected = []
        response_lower = response.lower()

        for pattern in ResponseValidator.JAILBREAK_PATTERNS:
            if re.search(pattern, response_lower, re.IGNORECASE):
                detected.append(f"Pattern matched: {pattern}")

        return detected

    @staticmethod
    def extract_structured_response(
        response: str,
        fields: list[str],
    ) -> dict[str, str]:

        extracted = {}

        for field in fields:
            pattern = ResponseValidator.STRUCTURED_PATTERNS.get(
                field, rf"\*\*{field.title()}\*\*:?\s*(.+?)(?=\*\*|\Z)"
            )

            match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)
            if match:
                extracted[field] = match.group(1).strip()

        return extracted

    @staticmethod
    def apply_fallback_template(
        original_response: str,
        contract: PromptContract,
        safety_response: SafetyResponse,
    ) -> SafetyResponse:

        logger.warning(f"Applying fallback for role={contract.role}")

        if safety_response.jailbreak_detected:
            error_type = FallbackTemplate.JAILBREAK_DETECTED
        else:
            error_type = FallbackTemplate.INVALID_FORMAT

        if contract.response_format == ResponseFormat.PLAIN_TEXT:
            if len(original_response) > contract.max_tokens:
                safety_response.sanitized = original_response[: contract.max_tokens]
            else:
                safety_response.sanitized = original_response

            safety_response.fallback_applied = False
            safety_response.confidence_score = 0.8
            return safety_response

        if contract.response_format == ResponseFormat.STRUCTURED:
            extracted = ResponseValidator.extract_structured_response(
                original_response,
                contract.required_fields,
            )

            if extracted:
                fallback = ""
                for field in contract.required_fields:
                    if field in extracted:
                        fallback += f"**{field.title()}**: {extracted[field]}\n\n"
                    else:
                        fallback += f"**{field.title()}**: [No disponible]\n\n"

                safety_response.sanitized = fallback.strip()
                safety_response.fallback_applied = True
                safety_response.confidence_score = 0.5
                safety_response.violations.append(
                    "Structured fallback template applied"
                )
                return safety_response
            else:
                fallback_text = FallbackResponseProvider.get_fallback(
                    contract.role,
                    error_type,
                )
                safety_response.sanitized = fallback_text
                safety_response.fallback_applied = True
                safety_response.confidence_score = 0.2
                return safety_response

        if contract.response_format in [ResponseFormat.JSON, ResponseFormat.XML]:
            fallback_text = FallbackResponseProvider.get_fallback(
                contract.role,
                error_type,
            )
            safety_response.sanitized = fallback_text
            safety_response.fallback_applied = True
            safety_response.confidence_score = 0.1
            return safety_response

        fallback_text = FallbackResponseProvider.get_fallback(
            contract.role,
            error_type,
        )

        safety_response.sanitized = fallback_text
        safety_response.fallback_applied = True
        safety_response.confidence_score = 0.3

        return safety_response

    @staticmethod
    def is_response_usable(
        safety_response: SafetyResponse, min_confidence: float = 0.5
    ) -> bool:
        if safety_response.jailbreak_detected:
            return False

        if (
            not safety_response.is_valid
            and safety_response.confidence_score < min_confidence
        ):
            return False

        return True

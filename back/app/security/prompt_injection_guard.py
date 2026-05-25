import logging
from app.security.risk_scorer import risk_scorer
from app.security.exceptions import PromptInjectionException

logger = logging.getLogger(__name__)


def detect_prompt_injection(text: str) -> bool:

    if not text or not isinstance(text, str):
        return False

    score = risk_scorer.score(text)

    if score.should_block:
        logger.warning(
            "Prompt injection detected",
            extra={
                "risk_level": score.level.value,
                "total_score": score.total_score,
                "injection_score": score.injection_score,
                "exfil_score": score.data_exfiltration_score,
                "jailbreak_score": score.jailbreak_score,
            },
        )
        return True

    return False


def validate_prompt_safety(text: str, risk_level: str = "HIGH") -> bool:

    if not text:
        return True

    score = risk_scorer.score(text)

    if score.should_block:
        logger.warning(
            "Prompt injection detected",
            extra={
                "risk_level": score.level.value,
                "total_score": score.total_score,
                "injection_score": score.injection_score,
                "exfil_score": score.data_exfiltration_score,
                "jailbreak_score": score.jailbreak_score,
            },
        )

    risk_thresholds = {
        "CRITICAL": 0.50,
        "HIGH": 0.60,
        "MEDIUM": 0.70,
        "LOW": 0.80,
    }

    threshold = risk_thresholds.get(risk_level.upper(), 0.60)

    if score.total_score >= threshold:
        logger.warning(
            "Prompt exceeds safety threshold",
            extra={
                "risk_level": risk_level,
                "threshold": threshold,
                "actual_score": score.total_score,
            },
        )
        raise PromptInjectionException("Entrada bloqueada por políticas de seguridad")

    return True

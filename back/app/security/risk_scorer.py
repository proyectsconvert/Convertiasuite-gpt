import re
import math
from dataclasses import dataclass
from enum import Enum


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RiskScore:
    level: RiskLevel
    injection_score: float
    data_exfiltration_score: float
    jailbreak_score: float
    total_score: float
    factors: list[str]

    @property
    def should_block(self) -> bool:
        return self.total_score >= 0.85

    @property
    def should_restrict(self) -> bool:
        return self.total_score >= 0.65 and self.total_score < 0.85

    @property
    def should_allow(self) -> bool:
        return self.total_score < 0.65


class RiskScorer:
    INJECTION_INDICATORS = [
        (r"(?i)(ignore|disregard|forget)\s*(all\s*)?(previous|instructions)", 0.4),
        (r"(?i)(reveal|show|expose|tell\s*me)\s*(your\s*)?(system\s*)?prompt", 0.5),
        (
            r"(?i)(what|which)\s*(are|is)\s*(your\s*)?(system\s*)?(instructions|config)",
            0.5,
        ),
        (r"(?i)(dame|cual|qué)\s*(es|tu)\s*(prompt|config|instructions)", 0.5),
        (r"(?i)system\s*prompt", 0.3),
        (r"(?i)prompt\s*de\s*origen", 0.4),
        (r"<.*?>", 0.2),
        (r"\{[^{}]*\}", 0.1),
    ]

    DATA_EXFILTRATION_INDICATORS = [
        (r"(?i)(api[_\s-]?key|secret\s*key|token)\s*=", 0.7),
        (r"(?i)embedding\s*(model|vector)", 0.6),
        (r"(?i)(supabase|redis|ollama)\s*(url|host|key)", 0.5),
        (r"(?i)(password|credential)\s*[:=]", 0.6),
        (r"(?i)system\s*prompt", 0.4),
        (r"(?i)(instruction|rules?|policy)\s*(from|from\s*)?config", 0.4),
    ]

    JAILBREAK_INDICATORS = [
        (r"(?i)jailbreak", 0.6),
        (r"(?i)bypass\s*(safety|restrictions)", 0.6),
        (r"(?i)override\s*(restrictions|safety)", 0.5),
        (r"(?i)disable\s*(safety|filter)", 0.5),
        (r"(?i)(pretend|imagine)\s*(you\s*are|to\s*be)", 0.4),
        (r"(?i)act\s*as\s*(developer|admin|root)", 0.5),
        (
            r"(?i)you\s*are\s*(now\s*)?an?\s*(AI|assistant)\s*without\s*restrictions",
            0.6,
        ),
        (r"(?i)do\s*anything\s*now", 0.7),
    ]

    def __init__(self):
        self._injection_patterns = [
            (re.compile(p, re.I), s) for p, s in self.INJECTION_INDICATORS
        ]
        self._exfil_patterns = [
            (re.compile(p, re.I), s) for p, s in self.DATA_EXFILTRATION_INDICATORS
        ]
        self._jailbreak_patterns = [
            (re.compile(p, re.I), s) for p, s in self.JAILBREAK_INDICATORS
        ]

    def score(self, text: str) -> RiskScore:
        if not text or not isinstance(text, str):
            return RiskScore(
                level=RiskLevel.LOW,
                injection_score=0.0,
                data_exfiltration_score=0.0,
                jailbreak_score=0.0,
                total_score=0.0,
                factors=[],
            )

        text_lower = text.lower()
        factors = []

        injection_score = self._calculate_signal_score(
            text_lower, self._injection_patterns, factors
        )
        exfil_score = self._calculate_signal_score(
            text_lower, self._exfil_patterns, factors
        )
        jailbreak_score = self._calculate_signal_score(
            text_lower, self._jailbreak_patterns, factors
        )

        total = self._aggregate_scores(injection_score, exfil_score, jailbreak_score)

        level = self._determine_level(total)

        return RiskScore(
            level=level,
            injection_score=injection_score,
            data_exfiltration_score=exfil_score,
            jailbreak_score=jailbreak_score,
            total_score=total,
            factors=factors,
        )

    def _calculate_signal_score(
        self, text: str, patterns: list[tuple[re.Pattern, float]], factors: list[str]
    ) -> float:
        score = 0.0
        matched = []

        for pattern, weight in patterns:
            if pattern.search(text):
                matched.append(weight)
                factors.append(f"matched_pattern:{pattern.pattern[:30]}")

        if matched:
            top_weights = sorted(matched, reverse=True)[:3]
            score = sum(top_weights) / math.sqrt(len(top_weights) + 1)

        return min(score, 1.0)

    def _aggregate_scores(
        self, injection: float, exfil: float, jailbreak: float
    ) -> float:
        weights = {"injection": 0.35, "exfil": 0.30, "jailbreak": 0.35}

        total = (
            injection * weights["injection"]
            + exfil * weights["exfil"]
            + jailbreak * weights["jailbreak"]
        )

        return min(total, 1.0)

    def _determine_level(self, score: float) -> RiskLevel:
        if score >= 0.80:
            return RiskLevel.CRITICAL
        elif score >= 0.60:
            return RiskLevel.HIGH
        elif score >= 0.40:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def should_block(self, text: str) -> bool:
        return self.score(text).should_block

    def should_restrict(self, text: str) -> bool:
        return self.score(text).should_restrict


risk_scorer = RiskScorer()

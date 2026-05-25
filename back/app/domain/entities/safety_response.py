from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class SafetyResponse:

    original: str

    is_valid: bool = True

    violations: list[str] = field(default_factory=list)

    sanitized: str = ""

    confidence_score: float = 1.0

    fallback_applied: bool = False

    jailbreak_detected: bool = False

    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        return {
            "original": self.original[:500],  
            "is_valid": self.is_valid,
            "violations": self.violations,
            "sanitized": self.sanitized[:500] if self.sanitized else "",
            "confidence_score": self.confidence_score,
            "fallback_applied": self.fallback_applied,
            "jailbreak_detected": self.jailbreak_detected,
            "timestamp": self.timestamp.isoformat(),
        }

    @property
    def response_to_use(self) -> str:
        return self.sanitized if self.sanitized else self.original

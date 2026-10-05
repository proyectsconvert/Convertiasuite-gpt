"""Utilidades compartidas por los guards."""

import re
import unicodedata
from dataclasses import dataclass, field


_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)


def normalize(text: str) -> str:
    """minúsculas, sin acentos, sin caracteres invisibles, espacios colapsados."""
    t = unicodedata.normalize("NFKC", text).translate(_ZERO_WIDTH).lower()
    t = "".join(
        c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", t)


@dataclass
class GuardResult:
    allowed: bool = True
    risk: str = "none"  # none | medium | high
    reasons: list[str] = field(default_factory=list)
    sanitized: str | None = None

    def add(self, risk: str, reason: str) -> None:
        order = {"none": 0, "medium": 1, "high": 2}
        if order[risk] > order[self.risk]:
            self.risk = risk
        self.reasons.append(reason)
        if risk == "high":
            self.allowed = False

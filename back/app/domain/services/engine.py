"""Detección de señales de riesgo / interés / hostilidad en llamadas."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

RISK_THRESHOLD = 5
INTEREST_THRESHOLD = 10

NEGATED_INTEREST_RISK = 1
NEGATION_WORDS = frozenset({"no", "nunca", "nada", "tampoco", "ni"})
NEGATION_WINDOW = 2  
_PUNCT = re.compile(r"[^\w\s]")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return " ".join(_PUNCT.sub("", text).split())


CATEGORIES: dict[str, tuple[str, dict[str, int]]] = {
    "interest": ("interest", {
        "interesante": 3, "me gusta": 2, "me interesa": 3,
        "eso suena bien": 1, "es justo lo que necesito": 3,
        "es lo que busco": 3, "exactamente lo que necesito": 3,
        "me parece bien": 2, "perfecto": 2, "genial": 2,
    }),
    "buying_signal": ("interest", {
        "cuanto cuesta": 4, "cual es el precio": 4, "como puedo pagar": 5,
        "formas de pago": 4, "donde firmo": 5, "quiero comprar": 5,
        "me lo llevo": 5, "envieme la informacion": 3,
        "mandeme la informacion": 3, "como lo contrato": 5,
    }),
    "risk": ("risk", {
        "no gracias": 2, "no estoy seguro": 2, "no me interesa": 3,
        "no le puedo entender": 2, "no quiero": 3, "no es lo que busco": 2,
        "no es para mi": 2, "no es lo que necesito": 2,
        "no es lo que quiero": 2,
    }),
    "price_objection": ("risk", {
        "muy caro": 3, "es caro": 2, "no tengo plata": 3,
        "no tengo dinero": 3, "no me alcanza": 3, "esta costoso": 2,
        "no puedo pagar": 3,
    }),
    "deferral": ("risk", {
        "llameme luego": 1, "llameme despues": 1, "ahora no puedo": 1,
        "estoy ocupado": 1, "estoy en reunion": 1, "no es buen momento": 1,
        "mas tarde": 1, "otro dia": 1,
    }),
    "competitor": ("risk", {
        "ya tengo uno": 2, "ya tengo ese servicio": 2,
        "ya estoy con otra empresa": 3, "estoy con la competencia": 3,
        "ya tengo contrato": 2,
    }),
    "distrust": ("risk", {
        "es una estafa": 4, "no confio": 3, "de donde sacaron mi numero": 3,
        "como consiguieron mis datos": 3, "es fraude": 4,
        "no doy mis datos": 3,
    }),
    "legal_threat": ("risk", {
        "los voy a denunciar": 5, "voy a demandar": 5, "superintendencia": 4,
        "habeas data": 5, "datos personales": 3, "voy a reportar": 4,
        "tengo grabada la llamada": 4,
    }),
    "confusion": ("risk", {
        "no entiendo": 1, "no entendi": 1, "repita": 1, "no se escucha": 1,
        "se corta": 1, "quien habla": 1, "de parte de quien": 1,
        "numero equivocado": 3,
    }),
    "referral": ("risk", {
        "hable con mi esposa": 1, "tengo que consultarlo": 1,
        "no soy yo quien decide": 1, "hable con mi jefe": 1,
    }),
}

INSULT_PHRASES = {
    "idiota": 5, "estupido": 5, "imbecil": 5, "inutil": 5,
    "mierda": 5, "pendejo": 5,
}
REFUSAL_PHRASES = {
    "no me llame mas": 5, "no quiero hablar": 3, "ya le dije que no": 3,
    "deje de llamarme": 5, "no quiero esta oferta": 2,
    "no quiero esta informacion": 2, "saquenme de esta lista": 5,
}
AGGRESSION_REGEX = re.compile(
    r"\b(?:no me joda|quitese|callese|hijo de (?:puta|perra)"
    r"|vayase a la (?:mierda|porra|chingada))\b"
)
AGGRESSION_WEIGHT = 5

CLOSING_REGEX = re.compile(
    r"\b(?:adios|hasta luego|chao|nos vemos|espero la informacion"
    r"|llamame luego|gracias por tu tiempo|gracias por la informacion"
    r"|gracias por tu ayuda)\b"
)


@dataclass(frozen=True, slots=True)
class Hit:
    phrase: str
    category: str
    kind: str  # "risk" | "interest"
    weight: int


def _alternation(phrases) -> re.Pattern[str]:
    # Más largas primero: "no me interesa" gana a "me interesa" y, como el
    # regex consume el texto, la frase corta ya no se cuenta dos veces.
    ordered = sorted(phrases, key=len, reverse=True)
    return re.compile(r"\b(?:" + "|".join(map(re.escape, ordered)) + r")\b")


def _build_scoring():
    lookup: dict[str, Hit] = {}
    for category, (kind, phrases) in CATEGORIES.items():
        for phrase, weight in phrases.items():
            p = normalize(phrase)
            lookup[p] = Hit(p, category, kind, weight)
    return _alternation(lookup), lookup


def _build_weighted(phrases: dict[str, int]):
    weights = {normalize(p): w for p, w in phrases.items()}
    return _alternation(weights), weights


_SCORE_RE, _SCORE_LOOKUP = _build_scoring()
_INSULT_RE, _INSULT_W = _build_weighted(INSULT_PHRASES)
_REFUSAL_RE, _REFUSAL_W = _build_weighted(REFUSAL_PHRASES)


def _is_negated(text: str, pos: int) -> bool:
    prev = text[max(0, pos - 24):pos].split()[-NEGATION_WINDOW:]
    return not NEGATION_WORDS.isdisjoint(prev)


def analyze(text_window: list[str]) -> list[Hit]:
    """Devuelve todas las frases detectadas (útil para explicar alertas)."""
    text = normalize(" ".join(text_window))
    hits: list[Hit] = []
    for m in _SCORE_RE.finditer(text):
        hit = _SCORE_LOOKUP[m.group(0)]
        if hit.kind == "interest" and _is_negated(text, m.start()):
            hit = Hit(hit.phrase, f"{hit.category}_negated", "risk",
                      NEGATED_INTEREST_RISK)
        hits.append(hit)
    return hits


def calculate_risk_delta(text_window: list[str]) -> tuple[int, int]:
    risk = interest = 0
    for hit in analyze(text_window):
        if hit.kind == "risk":
            risk += hit.weight
        else:
            interest += hit.weight
    return risk, interest


def detect_extreme_hostility(text: str) -> tuple[str, int] | None:
    t = normalize(text)

    if found := _INSULT_RE.findall(t):
        return "insult", max(_INSULT_W[f] for f in found)
    if AGGRESSION_REGEX.search(t):
        return "aggression", AGGRESSION_WEIGHT
    if found := _REFUSAL_RE.findall(t):
        return "refusal", max(_REFUSAL_W[f] for f in found)
    return None


def is_call_closing(text: str) -> str | None:
    m = CLOSING_REGEX.search(normalize(text))
    return m.group(0) if m else None
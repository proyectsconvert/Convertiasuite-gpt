import re
import unicodedata

# Orden = prioridad. Los roles de Operaciones van primero porque términos
# como "analista" o "it" (ej. "qual-IT-y") capturaban roles que no eran suyos.
_RULES: list[tuple[str, list[str]]] = [
    ("quality_analyst", [r"quality", r"calidad"]),
    ("back_office", [r"back[\s_-]?office"]),
    ("kam", [r"\bkam\b", r"key account"]),
    ("agent", [r"\bagent\w*"]),
    ("dev", [r"desarrollador", r"backend", r"frontend", r"\bit\b", r"\bti\b",
             r"ciberseguridad", r"seguridad informatica"]),
    ("bi", [r"\bbi\b", r"analista", r"datos"]),
    ("marketing", [r"marketing", r"\bseo\b", r"content"]),
    ("rh", [r"reclutamiento", r"talento", r"cultura", r"\brh\b", r"recursos humanos"]),
    ("design", [r"diseno", r"\bux\b", r"\bui\b"]),
    ("medical", [r"\bsst\b", r"salud", r"seguridad"]),
]


def _normalize(text: str) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def map_functional_role_to_llm_role(functional_role: str | None) -> str | None:
    if not functional_role:
        return None

    role = _normalize(functional_role)

    for llm_role, patterns in _RULES:
        if any(re.search(p, role) for p in patterns):
            return llm_role

    return None

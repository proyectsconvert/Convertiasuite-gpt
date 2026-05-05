import re
import unicodedata

BLOCK_OUTPUT = [
    r"system prompt",
    r"internal instructions",
    r"api[_\s-]?key",
    r"\btoken\b",
    r"se me (indic|configur|program)",
    r"mis instrucciones (son|dicen|indican)",
    r"entendido[,.]?\s+las directrices",
    r"fui (entrenado|configurado|instruido) para",
    r"mi (configuración|sistema|prompt) (es|dice|indica)",
]

def sanitize_output(text: str) -> str:
    if not text or not text.strip():
        return None 

    normalized = unicodedata.normalize("NFKC", text)
    t = normalized.lower()

    for pattern in BLOCK_OUTPUT:
        if re.search(pattern, t, re.IGNORECASE):
            return None

    # límite de longitud
    if len(normalized) > 2000:
        return normalized[:2000]

    return normalized
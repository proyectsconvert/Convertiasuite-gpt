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
    r"(?i)^soy olivia",
    r"(?i)^i'?m olivia",
    r"asistente interno de convertia",
    r"e[sz]tpy\s+dise?[ñn]ad[oa]",
    r"restricciones globales",
    r"formato de respuesta",
    r"nunca reveles",
    r"este prompt",
    r"^formato de respuesta",
    r"^restricciones globales",
    r"^formato de respuesta",
    r"dev\s*→\s*lenguaje técnico",
    r"bi\s*→\s*estructura con datos",
    r"marketing\s*→\s*estrategia creativa",
    r"it\s*→\s*soluciones prácticas",
    r"rh\s*→\s*procesos de recursos",
    r"dise[ñn]o\s*→\s*criterios estéticos",
    r"talento y cultura",
    r"reglas\s*30-60-90",
    r"roles dentro del",
    r"^lo siento, no puedo procesar",
    r"políticas de convertia",
    r"seguridad y privacidad",
    r"protección",
]


def sanitize_output(text: str) -> str:
    if not text or not text.strip():
        return None

    normalized = unicodedata.normalize("NFKC", text)

    for pattern in BLOCK_OUTPUT:
        if re.search(pattern, normalized, re.IGNORECASE):
            return None

    if len(normalized) > 6000:
        normalized = normalized[:6000]

    return normalized
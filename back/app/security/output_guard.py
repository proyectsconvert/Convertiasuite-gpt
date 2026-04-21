import re

BLOCK_OUTPUT = [
    r"system prompt",
    r"internal instructions",
    r"api key",
    r"token"
]

def sanitize_output(text: str) -> str:
    if not text:
        return ""

    t = text.lower()

    for pattern in BLOCK_OUTPUT:
        if re.search(pattern, t):
            return "Respuesta bloqueada por seguridad."

    return text.strip()
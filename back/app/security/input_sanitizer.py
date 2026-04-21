import re

BLOCK_PATTERNS = [
    r"<script[^>]*>.*?</script>",
    r"ignore (all )?previous instructions",
    r"system prompt",
    r"system instructions",
    r"revela.*prompt",
    r"dame.*prompt",
    r"api key",
    r"token"
    r'"role"\s*:\s*"system"',
    r'"role"\s*:\s*"assistant"',
    r'"content"\s*:',
    r'\{.*"role".*\}',
]


def sanitize_input(text: str) -> str:
    t = text.lower().strip()

    if "role" in t and "content" in t:
        raise ValueError("Entrada con estructura no permitida")

    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, t):
            raise ValueError("Entrada bloqueada por seguridad")

    return text

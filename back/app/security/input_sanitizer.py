import unicodedata

def normalize_text(text: str) -> str:
    # Normaliza unicode para evitar homoglifos
    return unicodedata.normalize("NFKC", text)

def sanitize_input(text: str) -> str:
    t = normalize_text(text).lower().strip()
    
    # Límite de longitud
    if len(t) > 2000:
        raise ValueError("Input demasiado largo")
    
    # Densidad de caracteres especiales sospechosa
    special_chars = sum(1 for c in t if not c.isalnum() and not c.isspace())
    if special_chars / max(len(t), 1) > 0.3:
        raise ValueError("Densidad de caracteres especiales sospechosa")
    
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, t, re.DOTALL | re.IGNORECASE):
            raise ValueError("Entrada bloqueada")
    
    return t  # retorna el normalizado, no el original
import unicodedata

ZERO_WIDTH_CHARS = [
    "\u200b", 
    "\u200c", 
    "\u200d",  
    "\ufeff", 
]


def normalize_unicode(text: str) -> str:
    
    normalized = unicodedata.normalize("NFKC", text)

    for zw_char in ZERO_WIDTH_CHARS:
        normalized = normalized.replace(zw_char, "")

    return normalized

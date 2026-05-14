KEYWORDS_VISION = [
    "imagen", "foto", "fotografía", "analiza esta", "qué ves", "describe la imagen"
]

KEYWORDS_ANALYSIS = [
    "investiga", "informe", "análisis profundo", "presenta", "reporte", "ppt"
]

KEYWORDS_CODE = [
    "código", "función", "bug", "error", "script", "programa", "clase"
]

KEYWORDS_REASONING = [
    "razona", "paso a paso", "explica por qué", "deduce", "lógica", "resuelve", "demuestra"
]

KEYWORDS_OCR = [
    "extrae el texto", "lee este documento", "transcribe", "escaneo", "pdf con texto"
]

KEYWORDS_MEDICAL = [
    "diagnóstico", "síntoma", "medicamento", "enfermedad", "tratamiento", "médico", "clínico"
]

# Agrupa todas las palabras clave por categoría
ALL_KEYWORDS = {
    "vision": KEYWORDS_VISION,
    "analysis": KEYWORDS_ANALYSIS,
    "code": KEYWORDS_CODE,
    "reasoning": KEYWORDS_REASONING,
    "ocr": KEYWORDS_OCR,
    "medical": KEYWORDS_MEDICAL,
}

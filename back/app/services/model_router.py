from app.core.model_config import MODELS, DEFAULT_MODEL_KEY, ALLOWED_MODELS


KEYWORDS_VISION = ["imagen", "foto", "fotografía", "analiza esta", "qué ves", "describe la imagen"]
KEYWORDS_ANALYSIS = ["investiga", "informe", "análisis profundo", "presenta", "reporte", "ppt"]
KEYWORDS_CODE = ["código", "función", "bug", "error", "script", "programa", "clase"]
KEYWORDS_REASONING = ["razona", "paso a paso", "explica por qué", "deduce", "lógica", "resuelve", "demuestra"]
KEYWORDS_OCR = ["extrae el texto", "lee este documento", "transcribe", "escaneo", "pdf con texto"]
KEYWORDS_MEDICAL = ["diagnóstico", "síntoma", "medicamento", "enfermedad", "tratamiento", "médico", "clínico"]


def route_model(message: str, user_role: str = None, has_attachment: bool = False) -> str:
    if has_attachment:
        return "vision"

    if user_role and user_role != "default":
        if user_role in ALLOWED_MODELS:
            return user_role

    msg_lower = message.lower()

    if any(k in msg_lower for k in KEYWORDS_VISION):
        return "vision"
    if any(k in msg_lower for k in KEYWORDS_ANALYSIS):
        return "analysis"
    if any(k in msg_lower for k in KEYWORDS_CODE):
        return "code"
    if any(k in msg_lower for k in KEYWORDS_REASONING):
        return "reasoning"
    if any(k in msg_lower for k in KEYWORDS_OCR):
        return "ocr"
    if any(k in msg_lower for k in KEYWORDS_MEDICAL):
        return "medical"

    return DEFAULT_MODEL_KEY


def get_model_info(model_key: str) -> dict:
    return MODELS.get(model_key, MODELS[DEFAULT_MODEL_KEY])
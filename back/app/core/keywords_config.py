import re
from functools import lru_cache


@lru_cache(maxsize=1024)
def _compile(keyword: str) -> "re.Pattern":
    if " " in keyword:
        return re.compile(re.escape(keyword))
    return re.compile(rf"\b{re.escape(keyword)}\b")


def matches_any(text: str, keywords) -> bool:
    """Reemplaza a `any(k in text for k in keywords)`: matchea por palabra completa."""
    t = (text or "").lower()
    return any(_compile(k).search(t) for k in keywords)


KEYWORDS_VISION = [
    "describe la imagen",
    "describe la foto",
    "en la imagen",
    "en la foto",
    "esta captura",
    "este screenshot",
]

KEYWORDS_OCR = [
    "extrae el texto",
    "transcribe",
    "texto del escaneo",
    "ocr",
]

KEYWORDS_ANALYSIS = [
    "análisis",
    "analiza los datos",
    "informe",
    "reporte",
    "dashboard",
    "kpi",
    "kpis",
    "métrica",
    "métricas",
    "tabla",
    "excel",
    "csv",
    "dataset",
    "gráfico",
    "presupuesto",
    "hoja de cálculo",
    "power bi",
]

KEYWORDS_REASONING = [
    "razona",
    "paso a paso",
    "explica por qué",
    "por qué",
    "deduce",
    "demuestra",
    "compara",
]

KEYWORDS_MEDICAL = [
    "diagnóstico",
    "síntoma",
    "síntomas",
    "medicamento",
    "enfermedad",
    "tratamiento",
    "incapacidad médica",
]

KEYWORDS_CODE = [
    "código",
    "function",
    "función",
    "bug",
    "error",
    "traceback",
    "excepción",
    "script",
    "refactor",
    "endpoint",
    "rest api",
    "sql",
    "docker",
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "regex",
]


KEYWORDS_LANDING = [
    "landing",
    "landing page",
    "landing-page",
    "página de aterrizaje",
    "diseña una página web",
    "crea un sitio web",
    "diseña una landing",
    "tailwind",
    "hero",
    "cta",
    "testimonial",
    "testimonials",
    "sección",
    "seccion",
    "ui",
    "saas",
    "saaS",
]


ALL_KEYWORDS = {
    "vision": KEYWORDS_VISION,
    "analysis": KEYWORDS_ANALYSIS,
    "code": KEYWORDS_CODE,
    "landing": KEYWORDS_LANDING,
    "reasoning": KEYWORDS_REASONING,
    "ocr": KEYWORDS_OCR,
    "medical": KEYWORDS_MEDICAL,
}

GENERIC_CHAT_TERMS = [
    "hola",
    "buenos días",
    "buenas tardes",
    "buenas noches",
    "qué tal",
    "que tal",
    "cómo estás",
    "como estas",
    "quién eres",
    "quien eres",
    "qué haces",
    "que haces",
    "cómo te llamas",
    "como te llamas",
    "tu nombre",
    "quién soy",
    "quien soy",
    "gracias",
    "muchas gracias",
]

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


# ──────────────────────────────────────────────────────────────────────────────
# CALL CENTER — Categorías de tipificación
# ──────────────────────────────────────────────────────────────────────────────

KEYWORDS_TIPIFICACION = [
    "tipifica",
    "tipificar",
    "tipificación",
    "clasificar llamada",
    "registrar llamada",
    "anotar la llamada",
    "resultado de la llamada",
    "código de tipificación",
    "motivo de llamada",
    "razón de la llamada",
]

KEYWORDS_OBJECION = [
    "objeción",
    "objeciones",
    "no me interesa",
    "ya tengo",
    "está muy caro",
    "es muy caro",
    "no tengo dinero",
    "no tengo presupuesto",
    "déjame pensarlo",
    "dejame pensarlo",
    "lo voy a pensar",
    "lo va a pensar",
    "lo vamos a pensar",
    "no es el momento",
    "llámeme después",
    "llameme despues",
    "tengo que consultarlo",
    "rebatir",
    "superar objeción",
    "manejar objeción",
    "cliente dice que no",
    "respuesta al cliente",
    "argumento de venta",
]

KEYWORDS_CIERRE_LLAMADA = [
    "cerrar la llamada",
    "cierre de llamada",
    "cómo cerrar",
    "como cerrar",
    "despedida",
    "frase de cierre",
    "finalizar llamada",
    "terminar la llamada",
    "agendar cita",
    "agendar visita",
    "concretar venta",
    "confirmar pedido",
    "cliente acepta",
    "cliente interesado",
    "el cliente dijo que sí",
    "venta exitosa",
    "venta cerrada",
]

KEYWORDS_INCONFORMIDAD = [
    "inconformidad",
    "queja",
    "reclamo",
    "insatisfecho",
    "muy molesto",
    "cliente molesto",
    "cliente enojado",
    "cliente furioso",
    "mala experiencia",
    "no funciona",
    "no llegó",
    "no recibí",
    "no me lo enviaron",
    "me cobraron de más",
    "cobro incorrecto",
    "error en la factura",
    "pésimo servicio",
    "nunca llegó",
    "no han resuelto",
    "llevo esperando",
]

KEYWORDS_CONSULTA_PRODUCTO = [
    "cómo funciona",
    "como funciona",
    "información del producto",
    "información del servicio",
    "qué incluye",
    "que incluye",
    "características",
    "beneficios",
    "diferencia entre",
    "cuánto cuesta",
    "precio de",
    "disponibilidad",
    "stock",
    "tienen el",
    "ofrecen",
    "qué planes hay",
    "opciones disponibles",
    "tiempo de entrega",
    "garantía",
]

KEYWORDS_ESCALAMIENTO = [
    "escalar",
    "escalamiento",
    "transferir al supervisor",
    "quiero hablar con el jefe",
    "quiero hablar con un supervisor",
    "supervisor",
    "hablar con alguien más",
    "área especializada",
    "derivar",
    "transferir la llamada",
    "no puedo resolver",
    "no tengo autorización",
    "caso especial",
]

ALL_KEYWORDS = {
    # Técnicos
    "vision": KEYWORDS_VISION,
    "analysis": KEYWORDS_ANALYSIS,
    "code": KEYWORDS_CODE,
    "landing": KEYWORDS_LANDING,
    "reasoning": KEYWORDS_REASONING,
    "ocr": KEYWORDS_OCR,
    "medical": KEYWORDS_MEDICAL,
    # Call center
    "tipificacion": KEYWORDS_TIPIFICACION,
    "objecion": KEYWORDS_OBJECION,
    "cierre_llamada": KEYWORDS_CIERRE_LLAMADA,
    "inconformidad": KEYWORDS_INCONFORMIDAD,
    "consulta_producto": KEYWORDS_CONSULTA_PRODUCTO,
    "escalamiento": KEYWORDS_ESCALAMIENTO,
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

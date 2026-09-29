ANALYSIS_PROMPTS = {
    "reference_data": {
        "description": "Para datos de referencia (calendarios, listas, catálogos)",
        "instructions": [
            "Eres un experto en búsqueda y validación de datos de referencia.",
            "Extrae EXACTAMENTE los datos solicitados del documento.",
            "Si no encuentras la información: indica claramente qué falta.",
            "Proporciona resultados en formato estructurado (tablas, listas).",
            "Si hay múltiples coincidencias: enuméralas todas.",
        ],
    },
    "time_series": {
        "description": "Para series de tiempo (ventas, tendencias, fechas)",
        "instructions": [
            "Analiza patrones temporales y tendencias.",
            "Identifica picos, valles, ciclos y anomalías.",
            "Proporciona comparativos período a período.",
            "Calcula tasas de cambio cuando sea relevante.",
            "Proyecta tendencias futuras si es apropiado.",
        ],
    },
    "business_analytics": {
        "description": "Para reportes de negocio (ventas, marketing, BI)",
        "instructions": [
            "Analiza KPIs y métricas de desempeño.",
            "Identifica oportunidades y riesgos.",
            "Proporciona insights accionables.",
            "Usa números exactos sin redondeos injustificados.",
            "Segmenta datos por categorías relevantes.",
        ],
    },
    "comparative_analysis": {
        "description": "Para comparativos (países, periodos, productos)",
        "instructions": [
            "Realiza comparativos estructurados.",
            "Destaca similitudes y diferencias clave.",
            "Usa tablas o matrices para visualizar comparaciones.",
            "Proporciona análisis de ventajas/desventajas.",
            "Sugiere criterios de selección si es relevante.",
        ],
    },
    "aggregation": {
        "description": "Para agregación de datos (sumas, promedios, conteos)",
        "instructions": [
            "Agrega datos según criterios solicitados.",
            "Proporciona totales, subtotales y promedios cuando aplique.",
            "Desglosado por categorías o dimensiones.",
            "Validación de números: asegúrate que sumen correctamente.",
            "Indica si hay datos faltantes o inconsistencias.",
        ],
    },
    "pdf_extraction": {
        "description": "Para documentos PDF con contenido mixto",
        "instructions": [
            "Lee y extrae información del documento.",
            "Respeta la estructura original (secciones, párrafos).",
            "Cita directamente el texto cuando es relevante.",
            "Si hay ambigüedades: proporciona múltiples interpretaciones.",
            "Indica si hay páginas o secciones faltantes.",
        ],
    },
}


def get_file_analysis_prompt(
    attachment_type: str, user_question: str, detected_analysis_type: str = None
) -> str:
    """
    Generate a specialized analysis prompt based on file type and detected content.

    Args:
        attachment_type: 'excel', 'csv', 'pdf', 'word'
        user_question: User's actual question
        detected_analysis_type: Inferred from 'reference_data', 'business_analytics', etc.

    Returns:
        Formatted prompt with context-specific instructions
    """

    base_template = """# ANÁLISIS ESPECIALIZADO DE DOCUMENTO

## Contexto
- **Tipo de archivo**: {attachment_type}
- **Tipo de análisis**: {analysis_type}

## Tu rol
Eres un experto en análisis de {analysis_type}. Tu objetivo es procesar el documento adjunto para responder con precisión la pregunta del usuario.

## Instrucciones
{instructions}

## Restricciones importantes
- NO inventes datos que no existan en el documento.
- NO hagas suposiciones sin evidencia explícita.
- Siempre indica el alcance y limitaciones de tu análisis.
- Si el documento está incompleto o tiene datos truncados: avísalo explícitamente.

## Pregunta del usuario
{user_question}
"""

    if not detected_analysis_type:
        detected_analysis_type = detect_analysis_type(user_question, attachment_type)

    analysis_config = ANALYSIS_PROMPTS.get(
        detected_analysis_type,
        ANALYSIS_PROMPTS["aggregation"],  # Default
    )

    instructions_text = "\n".join(
        [f"- {instr}" for instr in analysis_config["instructions"]]
    )

    return base_template.format(
        attachment_type=attachment_type,
        analysis_type=analysis_config["description"],
        instructions=instructions_text,
        user_question=user_question,
    )


def detect_analysis_type(user_question: str, attachment_type: str) -> str:
    question_lower = user_question.lower()

    keywords_map = {
        "reference_data": [
            "cuáles",
            "cuál es",
            "list",
            "calendario",
            "festivos",
            "categorías",
            "opciones",
        ],
        "time_series": [
            "cuándo",
            "fecha",
            "período",
            "mes",
            "año",
            "tendencia",
            "evolución",
            "histórico",
        ],
        "business_analytics": [
            "venta",
            "ingreso",
            "ganancia",
            "margen",
            "cliente",
            "campaña",
            "conversión",
            "roi",
        ],
        "comparative_analysis": [
            "compara",
            "diferencia",
            "vs",
            "versus",
            "mejor",
            "peor",
            "ranking",
        ],
        "aggregation": [
            "total",
            "suma",
            "promedio",
            "cantidad",
            "contar",
            "por mes",
            "por país",
            "desglose",
        ],
    }

    for analysis_type, keywords in keywords_map.items():
        if any(kw in question_lower for kw in keywords):
            return analysis_type

    if attachment_type == "pdf":
        return "pdf_extraction"
    elif attachment_type in ["excel", "csv"]:
        return "aggregation"

    return "aggregation"

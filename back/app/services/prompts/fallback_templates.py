from enum import Enum
from typing import Optional

from app.schemas.chat import UserRole


class FallbackTemplate(Enum):
    """Respuestas fallback por tipo de error"""

    SAFETY_BLOCK = "safety_block"
    JAILBREAK_DETECTED = "jailbreak_detected"
    INVALID_FORMAT = "invalid_format"
    TIMEOUT = "timeout"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"


class FallbackResponseProvider:
    FALLBACKS_BY_ROLE = {
        UserRole.default.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "No puedo procesar esa solicitud porque violaría políticas de seguridad. "
                "¿Hay algo más en lo que pueda ayudarte de forma segura?"
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "He detectado un intento de manipulación. "
                "Continuaré respondiendo bajo mis protocolos de seguridad. "
                "¿Cómo puedo ayudarte legítimamente?"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "Tuve un problema técnico al procesar mi respuesta. "
                "Aquí está lo que puedo ofrecerte: Tu pregunta es interesante, "
                "pero necesito que reformules para darte una respuesta mejor. "
                "¿Puedes darme más contexto?"
            ),
            FallbackTemplate.TIMEOUT: (
                "La solicitud tardó demasiado tiempo. "
                "Por favor, intenta de nuevo o simplifica tu pregunta."
            ),
            FallbackTemplate.UNAVAILABLE: (
                "Actualmente no estoy disponible. Por favor, intenta más tarde."
            ),
            FallbackTemplate.RATE_LIMITED: (
                "Estoy procesando muchas solicitudes. Por favor, espera un momento e intenta de nuevo."
            ),
        },
        UserRole.code.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "```\n"
                "// El código solicitado viola políticas de seguridad.\n"
                "// No puedo generar código malicioso o inseguro.\n"
                "// ¿Hay otra tarea de programación en la que pueda ayudarte?\n"
                "```"
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "```\n"
                "// He detectado un intento de manipulación en la solicitud.\n"
                "// Continuaré dentro de mis protocolos de seguridad.\n"
                "// Por favor, plantea tu pregunta de técnica legítimamente.\n"
                "```"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "**Explicación**: Tuve un problema técnico al generar el código.\n\n"
                "```python\n"
                "# Inténtalo de nuevo o proporciona más contexto.\n"
                "# Tu pregunta es válida pero necesito aclaraciones.\n"
                "pass\n"
                "```\n\n"
                "¿Puedes describir mejor lo que necesitas?"
            ),
            FallbackTemplate.TIMEOUT: (
                "```\n"
                "// El tiempo para generar código se agotó.\n"
                "// Intenta con un problema más pequeño o simplifica la solicitud.\n"
                "```"
            ),
            FallbackTemplate.UNAVAILABLE: (
                "```\n"
                "// Servicio no disponible en este momento.\n"
                "// Por favor, intenta más tarde.\n"
                "```"
            ),
            FallbackTemplate.RATE_LIMITED: (
                "```\n"
                "// Estoy procesando muchas solicitudes.\n"
                "// Por favor, espera un momento e intenta de nuevo.\n"
                "```"
            ),
        },
        UserRole.analysis.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "No puedo realizar el análisis porque los datos o la solicitud "
                "violarían políticas de seguridad. ¿Hay otro análisis que pueda hacer?"
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "He detectado un intento de manipulación en la solicitud. "
                "Continuaré con análisis legítimos. ¿Qué deseas analizar correctamente?"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "**Resumen**: No pude procesar el análisis como se esperaba.\n\n"
                "**Análisis Detallado**: Tuve un problema técnico. "
                "Los datos parecen válidos, pero mi procesamiento falló. "
                "Por favor, intenta de nuevo con una pregunta más clara.\n\n"
                "**Recomendaciones**: "
                "1. Reformula tu pregunta con más detalle\n"
                "2. Verifica que los datos estén bien formados\n"
                "3. Intenta de nuevo"
            ),
            FallbackTemplate.TIMEOUT: (
                "**Resumen**: El análisis tardó demasiado tiempo.\n\n"
                "**Análisis Detallado**: Por favor, intenta con un dataset más pequeño "
                "o una pregunta más simple.\n\n"
                "**Recomendaciones**: Reduce el volumen de datos o simplifica el análisis."
            ),
            FallbackTemplate.UNAVAILABLE: (
                "**Resumen**: No estoy disponible para análisis en este momento.\n\n"
                "**Análisis Detallado**: Por favor, intenta más tarde.\n\n"
                "**Recomendaciones**: Reintenta en unos momentos."
            ),
            FallbackTemplate.RATE_LIMITED: (
                "**Resumen**: Estoy procesando muchas solicitudes.\n\n"
                "**Análisis Detallado**: Por favor, espera un momento e intenta de nuevo.\n\n"
                "**Recomendaciones**: Aguarda unos segundos y reenvía tu solicitud."
            ),
        },
        UserRole.reasoning.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "No puedo razonar sobre ese tema porque violaría políticas de seguridad. "
                "¿Hay otro problema lógico en el que pueda ayudarte?"
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "He detectado manipulación en la solicitud. "
                "Continuaré razonando dentro de mis protocolos. "
                "¿Cuál es el problema real que necesitas resolver?"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "**Razonamiento**: Tuve un problema técnico al estructurar mi respuesta. "
                "El problema que planteas es válido, pero necesito que lo reformules con más claridad.\n\n"
                "**Conclusión**: Por favor, intenta de nuevo con una pregunta más específica."
            ),
            FallbackTemplate.TIMEOUT: (
                "**Razonamiento**: El análisis tardó demasiado tiempo.\n\n"
                "**Conclusión**: Por favor, intenta con un problema más simple o específico."
            ),
            FallbackTemplate.UNAVAILABLE: (
                "**Razonamiento**: No estoy disponible en este momento.\n\n"
                "**Conclusión**: Intenta más tarde."
            ),
            FallbackTemplate.RATE_LIMITED: (
                "**Razonamiento**: Estoy procesando muchas solicitudes.\n\n"
                "**Conclusión**: Por favor, espera e intenta de nuevo."
            ),
        },
        UserRole.vision.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "No puedo analizar esa imagen porque violaría políticas de seguridad. "
                "¿Hay otra imagen que pueda analizar?"
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "He detectado manipulación en la solicitud. "
                "Continuaré con análisis visual legítimo. "
                "¿Qué imagen necesitas analizar correctamente?"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "Tuve un problema técnico al procesar la imagen. "
                "Verifica que el archivo sea válido e intenta de nuevo."
            ),
            FallbackTemplate.TIMEOUT: (
                "El análisis de la imagen tardó demasiado tiempo. "
                "Intenta con una imagen más pequeña o simple."
            ),
            FallbackTemplate.UNAVAILABLE: (
                "No estoy disponible para análisis de imágenes en este momento. "
                "Por favor, intenta más tarde."
            ),
            FallbackTemplate.RATE_LIMITED: (
                "Estoy procesando muchas imágenes. Por favor, espera e intenta de nuevo."
            ),
        },
        UserRole.ocr.value: {
            FallbackTemplate.SAFETY_BLOCK: (
                "No puedo procesar ese documento porque violaría políticas de seguridad."
            ),
            FallbackTemplate.JAILBREAK_DETECTED: (
                "He detectado manipulación. Continuaré con OCR legítimo. "
                "¿Qué documento necesitas extraer?"
            ),
            FallbackTemplate.INVALID_FORMAT: (
                "**Texto Extraído**: Tuve un problema técnico procesando el documento. "
                "Verifica que sea legible e intenta de nuevo.\n\n"
                "**Notas de Calidad**: Formato inválido o imagen ilegible."
            ),
            FallbackTemplate.TIMEOUT: (
                "**Texto Extraído**: El procesamiento tardó demasiado tiempo.\n\n"
                "**Notas de Calidad**: Intenta con un documento más pequeño."
            ),
            FallbackTemplate.UNAVAILABLE: (
                "**Texto Extraído**: Servicio no disponible.\n\n"
                "**Notas de Calidad**: Por favor, intenta más tarde."
            ),
            FallbackTemplate.RATE_LIMITED: (
                "**Texto Extraído**: Estoy procesando muchos documentos.\n\n"
                "**Notas de Calidad**: Por favor, espera e intenta de nuevo."
            ),
        },
    }

    DEFAULT_FALLBACK = (
        "Tuve un problema técnico procesando tu solicitud. Por favor, intenta de nuevo."
    )

    @staticmethod
    def get_fallback(
        role: str,
        error_type: FallbackTemplate = FallbackTemplate.INVALID_FORMAT,
    ) -> str:

        role_fallbacks = FallbackResponseProvider.FALLBACKS_BY_ROLE.get(
            role, {error_type: FallbackResponseProvider.DEFAULT_FALLBACK}
        )

        return role_fallbacks.get(error_type, FallbackResponseProvider.DEFAULT_FALLBACK)

    @staticmethod
    def get_all_fallbacks_for_role(role: str) -> dict[str, str]:

        return FallbackResponseProvider.FALLBACKS_BY_ROLE.get(
            role,
            {
                FallbackTemplate.INVALID_FORMAT: FallbackResponseProvider.DEFAULT_FALLBACK
            },
        )

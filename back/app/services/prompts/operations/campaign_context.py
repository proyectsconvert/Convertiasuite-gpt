"""Bloque de CAMPAÑA ACTIVA (los datos configurables se tratan como no confiables)."""

import json

from ..guards import wrap_untrusted


def _single_line(value, limit: int = 120) -> str:
    return " ".join(str(value or "").split())[:limit]


def _render_config(value) -> str:
    if not value:
        return "{}"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)


def build_campaign_context_prompt(campaign_context: dict) -> str:
    if not campaign_context.get("has_active_campaign"):
        return """
## CAMPAÑA

El usuario no tiene una campaña activa identificada.

No asumas una campaña ni atribuyas procedimientos específicos
a una campaña determinada. Si la consulta depende de una campaña,
pide al usuario que la indique.
"""

    name = _single_line(campaign_context.get("campaign_name"))
    role = _single_line(campaign_context.get("campaign_role"))

    tracking = wrap_untrusted(
        "seguimiento", _render_config(campaign_context.get("tracking_format"))
    )
    platform = wrap_untrusted(
        "plataforma", _render_config(campaign_context.get("platform_config"))
    )
    pricing = wrap_untrusted(
        "comercial", _render_config(campaign_context.get("pricing_config"))
    )

    return f"""
## CAMPAÑA ACTIVA

Campaña: {name}
Rol: {role}

La campaña activa determina los procedimientos operativos que
pueden ser específicos para este usuario.

No utilices reglas de otra campaña como si fueran aplicables
a la campaña actual. No asumas que un procedimiento de una campaña
aplica a otra.

Si tienes dudas sobre un procedimiento, tipificación, precio, promoción
o condición comercial, verifícalo en el CONTEXTO RECUPERADO de la
campaña activa; si no aparece, indícalo en lugar de suponerlo.

### Configuración de seguimiento
{tracking}

### Configuración de plataforma
{platform}

### Configuración comercial
{pricing}
"""

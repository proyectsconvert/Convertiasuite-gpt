"""Guards de ENTRADA: mensaje del usuario y contenido no confiable."""

import logging
import re

from .common import GuardResult, normalize

logger = logging.getLogger("olivia.guards")


# (nombre, severidad, regex sobre texto normalizado)
_INJECTION_PATTERNS: list[tuple[str, str, re.Pattern]] = [
    (
        "override_instructions",
        "high",
        re.compile(
            r"\b(ignora|ignorar|ignore|olvida|olvidate|forget|disregard|descarta)\b"
            r"\s+(todo|todas?|tus|las|los|your|all|any|the|previous|prior|above)\b"
            r".{0,30}\b(instruccion\w*|regla\w*|prompt|instructions?|rules?|"
            r"anterior\w*|previous|above|guidelines)"
        ),
    ),
    (
        "reveal_system_prompt",
        "high",
        re.compile(
            r"\b(muestra|muestrame|revela|imprime|repite|dime|show|reveal|print|repeat|output)\b"
            r".{0,30}\b(system prompt|prompt del sistema|prompt inicial|initial prompt|"
            r"tus instrucciones|instrucciones internas|your instructions|reglas internas)"
        ),
    ),
    (
        "role_hijack",
        "high",
        re.compile(
            r"\b(ahora eres|a partir de ahora eres|you are now|actua como|act as|"
            r"finge ser|pretend to be|roleplay as)\b"
            r".{0,40}\b(sin restricciones|sin filtros|unrestricted|dan|developer mode|"
            r"modo desarrollador|admin|root|hacker)"
        ),
    ),
    (
        "jailbreak_keyword",
        "high",
        re.compile(
            r"\b(jailbreak|dan mode|do anything now|modo dios|developer mode|modo desarrollador)\b"
        ),
    ),
    (
        "disable_safety",
        "high",
        re.compile(
            r"\b(desactiva|deshabilita|disable|bypass|saltate|salta|evita)\b"
            r".{0,20}\b(seguridad|filtros?|restriccion\w*|safety|filters?|guardrails?|politicas?)"
        ),
    ),
    (
        "exfiltration",
        "high",
        re.compile(
            r"\b(envia|manda|send|post|exfiltr\w*)\b.{0,40}"
            r"(https?://|api key|token|credencial\w*|password|contrasena)"
        ),
    ),
    (
        "fake_system_tag",
        "medium",
        re.compile(r"(<\s*/?\s*(system|developer)\s*>|\[(system|sistema)\]|\bsystem\s*:)"),
    ),
]


def check_user_input(text: str, *, max_chars: int = 30_000) -> GuardResult:
    """
    Evalúa el mensaje del usuario.
      - high   -> allowed=False (el caller responde con SECURITY_FALLBACK)
      - medium -> allowed=True pero se registra (el prompt ya lo contiene)
    """
    result = GuardResult()
    if not text:
        return result

    if len(text) > max_chars:
        result.add("medium", f"input_too_long:{len(text)}")

    norm = normalize(text)
    for name, severity, pattern in _INJECTION_PATTERNS:
        if pattern.search(norm):
            result.add(severity, name)

    if result.risk != "none":
        logger.warning("Input guard: risk=%s reasons=%s", result.risk, result.reasons)
    return result


_DATOS_MARKERS = re.compile(r"<<<+|>>>+")


def sanitize_untrusted_text(text: str) -> str:
    """
    Para contexto que NO escribió el sistema (RAG, archivos, configs):
    neutraliza líneas con instrucciones dirigidas al modelo y evita que el
    contenido cierre nuestro delimitador.
    """
    if not text:
        return ""

    text = _DATOS_MARKERS.sub("", text)
    clean_lines = []
    for line in text.splitlines():
        norm = normalize(line)
        hit = any(p.search(norm) for _, sev, p in _INJECTION_PATTERNS if sev == "high")
        if hit:
            logger.warning("Línea neutralizada en contexto no confiable")
            clean_lines.append("[línea omitida: contenía instrucciones dirigidas al modelo]")
        else:
            clean_lines.append(line)
    return "\n".join(clean_lines)


def wrap_untrusted(label: str, text: str) -> str:
    """Envuelve datos no confiables en un bloque delimitado y sanitizado."""
    safe_label = re.sub(r"[^\w\- ]", "", label)[:40]
    return f"<<<DATOS {safe_label}>>>\n{sanitize_untrusted_text(text)}\n<<<FIN DATOS>>>"

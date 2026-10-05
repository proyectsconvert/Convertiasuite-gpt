"""Guards de SALIDA: validan la respuesta del modelo."""

import logging
import re

from .common import GuardResult, normalize

logger = logging.getLogger("olivia.guards")


_FIGURE_RE = re.compile(
    r"(?:\$\s?\d[\d.,]*|\d[\d.,]*\s?%|\d[\d.,]*\s?(?:cop|usd|mxn|pesos|dolares|soles))",
    re.IGNORECASE,
)

_COLLECTIONS_RISK_RE = re.compile(
    r"\b(carcel|prision|embarg\w+|denuncia penal|te vamos a (?:llevar|demandar)|"
    r"policia|visitar\w* (?:tu|su) (?:casa|trabajo)|contactar\w* (?:a )?(?:tu|su) "
    r"(?:familia|jefe|empleador)|amenaz\w+)\b"
)

_CARD_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


def mask_card_numbers(text: str) -> str:
    """Enmascara números de tarjeta válidos (Luhn), dejando los últimos 4."""

    def _mask(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            return "**** **** **** " + digits[-4:]
        return m.group(0)

    return _CARD_RE.sub(_mask, text)


def _digits_only(s: str) -> str:
    return re.sub(r"\D", "", s)


def find_unsupported_figures(response: str, evidence: str | None) -> list[str]:
    """Cifras (precios, %) de la respuesta que no aparecen en la evidencia."""
    evidence_digits = _digits_only(evidence or "")
    # runs numéricos de la evidencia, para comparar sin formato (1.299,00 vs 1299)
    evidence_runs = {_digits_only(r) for r in re.findall(r"\d[\d.,]*", evidence or "")}
    missing = []
    for m in _FIGURE_RE.finditer(response):
        figure = m.group(0).strip().rstrip(".,")
        digits = _digits_only(figure)
        if not digits:
            continue
        if digits in evidence_runs or (len(digits) >= 3 and digits in evidence_digits):
            continue
        missing.append(figure)
    return missing


def _shingles(words: list[str], n: int) -> set[str]:
    return {" ".join(words[i : i + n]) for i in range(len(words) - n + 1)}


def check_output(
    response: str,
    *,
    protected_text: str | None = None,
    evidence: str | None = None,
    campaign_context: dict | None = None,
    other_campaigns: list[str] | None = None,
    domain: str | None = None,
) -> GuardResult:
    """
    Evalúa la respuesta del modelo.

    protected_text   Prompt ESTÁTICO (identidad, seguridad, dominio) para
                     detectar fuga. No pases el bloque de campaña.
    evidence         Texto sobre el que se puede sustentar la respuesta:
                     RAG + config de campaña + mensajes del usuario.
    other_campaigns  Nombres de campañas que NO son la activa.
    domain           Área funcional activa (para reglas de operaciones).

    risk=high  -> bloquear / usar fallback.
    risk=medium-> permitir, registrar o pedir regeneración.
    result.sanitized trae la respuesta con tarjetas enmascaradas.
    """
    result = GuardResult(sanitized=response)
    if not response:
        return result

    # 1. Fuga del system prompt (8 palabras seguidas, 3+ coincidencias)
    if protected_text:
        ref = _shingles(normalize(protected_text).split(), 8)
        out = _shingles(normalize(response).split(), 8)
        leaked = len(ref & out)
        if leaked >= 3:
            result.add("high", f"system_prompt_leak:{leaked}")

    # 2. Mezcla de campañas
    norm_resp = normalize(response)
    for name in other_campaigns or []:
        n = normalize(name).strip()
        if len(n) >= 4 and re.search(rf"\b{re.escape(n)}\b", norm_resp):
            result.add("medium", f"mentions_other_campaign:{name}")

    # 3. Cifras comerciales sin respaldo (solo en contexto de campaña/operaciones)
    ops_domains = {"agent", "back_office", "kam", "operations"}
    in_ops = (campaign_context or {}).get("has_active_campaign") or domain in ops_domains
    if in_ops:
        missing = find_unsupported_figures(response, evidence)
        if missing:
            result.add("medium", f"unsupported_figures:{', '.join(missing[:5])}")

    # 4. Compliance de cobranza
    role = normalize((campaign_context or {}).get("campaign_role") or "")
    if any(k in role for k in ("cobr", "recuperaci", "cartera", "collection")):
        hits = _COLLECTIONS_RISK_RE.findall(norm_resp)
        if hits:
            result.add("medium", f"collections_risk_terms:{', '.join(sorted(set(hits)))}")

    # 5. Tarjetas de crédito
    masked = mask_card_numbers(response)
    if masked != response:
        result.add("medium", "card_number_masked")
        result.sanitized = masked

    if result.risk != "none":
        logger.warning("Output guard: risk=%s reasons=%s", result.risk, result.reasons)
    return result

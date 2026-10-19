"""Motor de sugerencias en tiempo real para llamadas comerciales (DQLE-36).

Orquesta:
1. Detección rápida de señales con engine.py (riesgo, objeciones, hostilidad, señales de compra).
2. Determinación de prioridad de señales críticas.
3. Carga y aplicación de Habilidades & Protocolos de Campaña (campaign_skills).
4. Generación guiada por LLM (qwen2.5:7b) con fallback determinístico ultra-rápido (<50ms).
5. Emisión de tarjetas estructuradas de sugerencia para el copiloto del agente.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from app.infra.clients.ollama_client import OllamaClient

from app.domain.events.events import build_event
from app.domain.services.engine import (
    INTEREST_THRESHOLD,
    RISK_THRESHOLD,
    Hit,
    analyze,
    calculate_risk_delta,
    detect_extreme_hostility,
    is_call_closing,
)
from app.services.prompts.operations.call_protocols import (
    BASE_PROTOCOL,
    PROTOCOL_BY_SIGNAL,
    build_messages,
)

logger = logging.getLogger("olivia.suggestion_engine")

# Orden estricto de prioridad de señales (las más críticas primero)
SIGNAL_PRIORITY = [
    "insult",
    "aggression",
    "legal_threat",
    "refusal",
    "distrust",
    "price_objection",
    "competitor",
    "deferral",
    "confusion",
    "referral",
    "risk",
    "buying_signal",
    "interest",
]

# Respuestas predeterminadas y confiables por señal (Fallback sub-50ms)
FAST_PROTOCOLS: dict[str, dict[str, str]] = {
    "insult": {
        "protocol": "Protocolo de Contención de Hostilidad",
        "action": "Mantener calma, no escalar y solicitar respeto mutuo",
        "phrase": "Comprendo su molestia. Le pido respeto mutuo para poder brindarle una solución adecuada a su situación.",
    },
    "aggression": {
        "protocol": "Protocolo de Desescalamiento Inmediato",
        "action": "Validar malestar con tono sereno sin justificar ni discutir",
        "phrase": "Entiendo que esté indispuesto. Estoy aquí para ayudarle de la mejor manera si me permite orientarle.",
    },
    "legal_threat": {
        "protocol": "Protocolo Legal y Protección al Consumidor",
        "action": "No confrontar y ofrecer los canales formales de atención",
        "phrase": "Entiendo su posición. Con gusto le facilito los canales oficiales de radicación y atención de solicitudes de la compañía.",
    },
    "distrust": {
        "protocol": "Protocolo de Confianza y Seguridad",
        "action": "Identificar procedencia del contacto y garantizar seguridad de datos",
        "phrase": "Comprendo su precaución. Nos comunicamos directamente de parte de la compañía. En ningún momento le pediremos contraseñas ni datos sensibles.",
    },
    "refusal": {
        "protocol": "Protocolo de Cierre Respetuoso",
        "action": "Agradecer el tiempo y registrar solicitud sin presionar",
        "phrase": "Comprendo perfectamente su decisión. Le agradezco su tiempo el día de hoy y que tenga una excelente jornada.",
    },
    "price_objection": {
        "protocol": "Protocolo de Manejo de Objeción de Precio",
        "action": "Reencuadrar costo en valor y ofrecer alternativas o facilidades",
        "phrase": "Entiendo que el presupuesto es prioritario. Justamente por eso contamos con alternativas flexibles que se adaptan a su conveniencia.",
    },
    "competitor": {
        "protocol": "Protocolo de Competencia",
        "action": "Validar su proveedor actual y resaltar diferenciadores clave",
        "phrase": "Es un excelente proveedor. Permítame compartirle brevemente qué beneficio exclusivo adicional podemos aportarle hoy.",
    },
    "deferral": {
        "protocol": "Protocolo de Reagendamiento",
        "action": "Acordar una fecha y hora precisa para retomar el contacto",
        "phrase": "Disculpe interrumpir sus actividades. ¿Le parece bien si le contacto mañana a primera hora o prefiere en la tarde?",
    },
    "confusion": {
        "protocol": "Protocolo de Clarificación y Empatía",
        "action": "Simplificar el mensaje y verificar canal de audio",
        "phrase": "Con gusto le resumo lo más importante de manera sencilla. ¿Me escucha con claridad en este momento?",
    },
    "referral": {
        "protocol": "Protocolo de Contacto con Decisor",
        "action": "Solicitar datos de contacto del decisor o coordinar llamada conjunta",
        "phrase": "Totalmente de acuerdo. ¿A qué número o en qué horario podríamos conversar con la persona encargada para coordinar?",
    },
    "risk": {
        "protocol": "Protocolo de Rescate Preventivo",
        "action": "Pregunta abierta para entender la duda principal",
        "phrase": "Noto cierta inquietud sobre la propuesta. ¿Hay algún detalle específico que le genere dudas?",
    },
    "buying_signal": {
        "protocol": "Protocolo de Cierre Comercial",
        "action": "Concretar condiciones y avanzar a la confirmación",
        "phrase": "Con mucho gusto le detallo los pasos para formalizarlo. ¿Prefiere que validemos los datos ahora mismo?",
    },
    "interest": {
        "protocol": "Protocolo de Calificación de Interés",
        "action": "Profundizar en la necesidad prioritaria del cliente",
        "phrase": "Me alegra que le resulte de interés. ¿Cuál de estos beneficios se ajusta más a lo que necesita actualmente?",
    },
    "closing": {
        "protocol": "Protocolo de Cierre Cordial",
        "action": "Despedida profesional y confirmación de próximos pasos",
        "phrase": "Muchas gracias por su atención el día de hoy. Quedamos a su disposición. ¡Que tenga un excelente día!",
    },
}


@dataclass
class SuggestionPayload:
    call_id: str
    trigger_type: str  # "hostility" | "risk_threshold" | "objection" | "buying_signal" | "closing" | "interest"
    speaker: str  # Siempre "customer" para alertas reactivas
    primary_signal: str
    risk_score: int
    interest_score: int
    suggested_phrase: str
    recommended_action: str
    protocol_applied: str
    evidence: str
    confidence: float
    model_used: str
    occurred_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SuggestionEngine:
    """Motor de sugerencias proactivas para el copiloto en vivo del agente."""

    def __init__(
        self,
        ollama_client: Optional[OllamaClient] = None,
        model: str = "qwen2.5:7b",
        llm_timeout_seconds: float = 2.0,
    ):
        self.ollama_client = ollama_client
        self.model = model.strip()
        self.llm_timeout_seconds = llm_timeout_seconds
        self._campaign_skills_cache: dict[str, tuple[float, str]] = {}

    def get_campaign_skills_context(self, campaign_id: str) -> str:
        """Obtiene el contexto textual de habilidades y protocolos asignados a la campaña.
        
        Usa caché en memoria de 60 segundos para evitar llamadas repetidas a la base de datos.
        """
        now = time.time()
        if campaign_id in self._campaign_skills_cache:
            ts, ctx = self._campaign_skills_cache[campaign_id]
            if now - ts < 60:
                return ctx

        context_lines: list[str] = []
        try:
            from app.infra.clients.supabase_client import SupabaseClient

            supabase = SupabaseClient().db
            res = (
                supabase.table("campaign_skills")
                .select("skill_id, custom_content, is_active")
                .eq("campaign_id", campaign_id)
                .eq("is_active", True)
                .execute()
            )

            if res.data:
                for row in res.data:
                    skill_id = row.get("skill_id", "")
                    custom = row.get("custom_content") or ""
                    context_lines.append(f"### Habilidad: {skill_id.upper()}")
                    if custom:
                        context_lines.append(f"Reglas personalizadas:\n{custom}")
        except Exception as e:
            logger.debug("No se pudo cargar campaign_skills de base de datos para %s: %s", campaign_id, e)

        # Fallback a archivos locales si no hay en DB
        if not context_lines:
            base_app_dir = Path(__file__).resolve().parent.parent.parent
            skills_dir = base_app_dir / "capabilities" / "campaings_skills"
            if skills_dir.exists():
                for sub in skills_dir.iterdir():
                    prompt_file = sub / "prompt.md"
                    if sub.is_dir() and prompt_file.exists():
                        try:
                            context_lines.append(f"### Plantilla Base: {sub.name.upper()}")
                            context_lines.append(prompt_file.read_text(encoding="utf-8")[:600])
                        except Exception:
                            pass

        result_context = "\n\n".join(context_lines) if context_lines else "Campaña estándar de atención y ventas telefónicas."
        self._campaign_skills_cache[campaign_id] = (now, result_context)
        return result_context

    def select_primary_signal(
        self,
        text: str,
        text_window: list[str],
        hostility: Optional[tuple[str, int]],
        closing_phrase: Optional[str],
        hits: list[Hit],
        accumulated_risk: int,
    ) -> tuple[str, str, str]:
        """Determina la señal prioritaria que motiva la sugerencia.
        
        Devuelve (trigger_type, primary_signal, evidence).
        """
        # 1. Prioridad máxima: Hostilidad extrema o insultos
        if hostility:
            h_type, _ = hostility
            return "hostility", h_type, text

        # 2. Señales analizadas por engine.py ordenadas por severidad
        detected_categories = {h.category: h for h in hits}

        for candidate_signal in SIGNAL_PRIORITY:
            if candidate_signal in detected_categories:
                hit = detected_categories[candidate_signal]
                trigger = "buying_signal" if candidate_signal == "buying_signal" else (
                    "interest" if candidate_signal == "interest" else "objection"
                )
                return trigger, candidate_signal, hit.phrase

        # 3. Umbral de riesgo superado
        if accumulated_risk >= RISK_THRESHOLD:
            return "risk_threshold", "risk", text

        # 4. Cierre de llamada detectado
        if closing_phrase:
            return "closing", "closing", closing_phrase

        return "", "", ""

    def _get_fast_rule_suggestion(
        self,
        signal: str,
        trigger_type: str,
        evidence: str,
    ) -> tuple[str, str, str, float]:
        """Devuelve la recomendación instantánea predefinida (sub-50ms)."""
        fallback = FAST_PROTOCOLS.get(
            signal,
            FAST_PROTOCOLS.get(
                trigger_type,
                {
                    "protocol": "Protocolo General de Campaña",
                    "action": "Escuchar activamente y validar la solicitud del cliente",
                    "phrase": "Comprendo lo que me indica. Con gusto le colaboro para resolverlo.",
                },
            ),
        )

        return (
            fallback["phrase"],
            fallback["action"],
            fallback["protocol"],
            0.92,
        )

    async def _generate_llm_suggestion(
        self,
        signal: str,
        text_window: list[str],
        campaign_context: str,
    ) -> Optional[tuple[str, str, str, float]]:
        """Invoca al LLM local con el protocolo específico para enriquecer la respuesta."""
        if not self.ollama_client:
            return None

        try:
            system_prompt, user_prompt = build_messages(signal, text_window, campaign_context)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            response_raw = await self.ollama_client.generate_chat(
                messages=messages,
                model=self.model,
                temperature=0.1,
                num_ctx=2048,
                max_tokens=180,
                extra_options={"timeout": self.llm_timeout_seconds},
            )

            # Extraer JSON de la respuesta
            clean_json = response_raw.strip()
            if "```" in clean_json:
                clean_json = clean_json.split("```")[1]
                if clean_json.startswith("json"):
                    clean_json = clean_json[4:]
                clean_json = clean_json.strip()

            parsed = json.loads(clean_json)

            # Mapear según la estructura de salida de cada protocolo
            suggested_phrase = ""
            recommended_action = ""
            protocol_name = f"Protocolo Especializado: {signal.capitalize()}"

            if "agent_guidance" in parsed:
                guidance = parsed["agent_guidance"]
                suggested_phrase = guidance.get("suggested_reply") or guidance.get("suggested_phrase") or ""
                recommended_action = (
                    guidance.get("action")
                    or guidance.get("strategy")
                    or guidance.get("next_step")
                    or "Aplicar protocolo sugerido"
                )

            confidence = float(parsed.get("confidence", 0.90))

            if suggested_phrase:
                return (suggested_phrase, recommended_action, protocol_name, confidence)

        except Exception as e:
            logger.debug("Inferencia LLM falló o excedió timeout, aplicando fallback determinístico: %s", e)

        return None

    async def evaluate_turn(
        self,
        text: str,
        text_window: list[str],
        call_id: str,
        campaign_id: str = "default",
        accumulated_risk: int = 0,
        accumulated_interest: int = 0,
    ) -> Optional[dict[str, Any]]:
        """Punto de entrada principal para evaluar la frase del cliente y emitir sugerencia.
        
        Si no hay motivo de alerta o recomendación, retorna None para no saturar al agente.
        """
        if not text or not text.strip():
            return None

        # 1. Reglas base del motor
        hits = analyze([text])
        hostility = detect_extreme_hostility(text)
        closing_phrase = is_call_closing(text)

        # 2. Selección de señal prioritaria
        trigger_type, primary_signal, evidence = self.select_primary_signal(
            text=text,
            text_window=text_window,
            hostility=hostility,
            closing_phrase=closing_phrase,
            hits=hits,
            accumulated_risk=accumulated_risk,
        )

        if not trigger_type or not primary_signal:
            return None

        # 3. Contexto de habilidades de la campaña
        campaign_context = self.get_campaign_skills_context(campaign_id)

        # 4. Generación: intento LLM con fallback instantáneo garantizado
        model_used = self.model
        llm_result = await self._generate_llm_suggestion(
            signal=primary_signal,
            text_window=text_window,
            campaign_context=campaign_context,
        )

        if llm_result:
            suggested_phrase, recommended_action, protocol_applied, confidence = llm_result
        else:
            model_used = "deterministic_rule_engine"
            suggested_phrase, recommended_action, protocol_applied, confidence = self._get_fast_rule_suggestion(
                signal=primary_signal,
                trigger_type=trigger_type,
                evidence=evidence,
            )

        # 5. Construcción del evento formal de sugerencia
        now_iso = datetime.now(timezone.utc).isoformat()
        suggestion_payload = SuggestionPayload(
            call_id=call_id,
            trigger_type=trigger_type,
            speaker="customer",
            primary_signal=primary_signal,
            risk_score=accumulated_risk,
            interest_score=accumulated_interest,
            suggested_phrase=suggested_phrase,
            recommended_action=recommended_action,
            protocol_applied=protocol_applied,
            evidence=evidence,
            confidence=confidence,
            model_used=model_used,
            occurred_at=now_iso,
        )

        # Evento estandarizado para WebSocket / frontend
        event = build_event(
            event_type="call_suggestion",
            call_id=call_id,
            payload=suggestion_payload.to_dict(),
            risk_score=accumulated_risk,
            interest_score=accumulated_interest,
            call_status="closing" if trigger_type == "closing" else "active",
        )

        return event
"""Router de FastAPI para el servicio de Copiloto en Tiempo Real (OlivIA).

Permite recibir turnos de conversación (provenientes de inConcert u otras fuentes)
y devolver sugerencias en tiempo real (<50ms) usando SuggestionEngine.
"""
import logging
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.domain.services.suggestion_engine import SuggestionEngine

logger = logging.getLogger("olivia.api.copilot")

router = APIRouter(
    prefix="/v1/copilot",
    tags=["copilot"],
)

# Instancia singleton del motor de sugerencias
_engine = SuggestionEngine()


class CopilotTurnRequest(BaseModel):
    text: str = Field(..., description="Texto reconocido de la frase dicha por el cliente o agente.")
    call_id: str = Field(..., description="Identificador único de la llamada en curso (inConcert interactionId).")
    campaign_id: str = Field("default", description="ID de la campaña activa para cargar protocolos y skills.")
    text_window: Optional[List[str]] = Field(None, description="Últimas frases de contexto de la llamada.")
    speaker: str = Field("client", description="Emisor de la frase ('client' o 'agent').")
    accumulated_risk: int = Field(0, description="Puntaje de riesgo acumulado en la llamada.")
    accumulated_interest: int = Field(0, description="Puntaje de interés acumulado en la llamada.")


class CopilotSuggestionData(BaseModel):
    call_id: str
    campaign_id: str
    trigger_type: str
    primary_signal: str
    protocol_applied: str
    recommended_action: str
    suggested_phrase: str
    confidence: float
    model_used: str
    latency_ms: float
    evidence: str


class CopilotTurnResponse(BaseModel):
    has_suggestion: bool
    suggestion: Optional[CopilotSuggestionData] = None
    accumulated_risk: int = 0
    accumulated_interest: int = 0
    status: str = "ok"


@router.get("/health")
async def copilot_health():
    """Verifica el estado del motor de sugerencias del copiloto."""
    return {
        "status": "healthy",
        "module": "copilot_suggestion_engine",
        "deterministic_engine": True,
        "llm_enrichment_enabled": True,
    }


@router.post("/suggest", response_model=CopilotTurnResponse)
async def evaluate_copilot_turn(req: CopilotTurnRequest):
    """Evalúa un turno de llamada en tiempo real y devuelve sugerencia si se dispara alguna señal."""
    t0 = time.perf_counter()
    window = req.text_window or [req.text]

    try:
        event = await _engine.evaluate_turn(
            text=req.text,
            text_window=window,
            call_id=req.call_id,
            campaign_id=req.campaign_id,
            accumulated_risk=req.accumulated_risk,
            accumulated_interest=req.accumulated_interest,
        )

        latency_ms = (time.perf_counter() - t0) * 1000.0

        if not event or not event.get("payload"):
            return CopilotTurnResponse(
                has_suggestion=False,
                suggestion=None,
                accumulated_risk=req.accumulated_risk,
                accumulated_interest=req.accumulated_interest,
            )

        payload = event["payload"]
        suggestion_data = CopilotSuggestionData(
            call_id=payload.get("call_id", req.call_id),
            campaign_id=payload.get("campaign_id", req.campaign_id),
            trigger_type=payload.get("trigger_type", "rule"),
            primary_signal=payload.get("primary_signal", "unknown"),
            protocol_applied=payload.get("protocol_applied", "Protocolo Estándar"),
            recommended_action=payload.get("recommended_action", ""),
            suggested_phrase=payload.get("suggested_phrase", ""),
            confidence=float(payload.get("confidence", 0.9)),
            model_used=payload.get("model_used", "deterministic"),
            latency_ms=round(payload.get("latency_ms", latency_ms), 2),
            evidence=payload.get("evidence", req.text),
        )

        return CopilotTurnResponse(
            has_suggestion=True,
            suggestion=suggestion_data,
            accumulated_risk=req.accumulated_risk,
            accumulated_interest=req.accumulated_interest,
        )

    except Exception as e:
        logger.error(f"Error evaluando turno de copiloto: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en motor de sugerencias: {str(e)}")

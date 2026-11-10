from typing import List, Optional
from pydantic import BaseModel, Field
from app.domain.enums.speaker import SpeakerRole


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: float = 1.0
    speaker: Optional[SpeakerRole] = None


class DiarizedTurn(BaseModel):
    speaker: SpeakerRole = Field(..., description="Rol del locutor (agent o customer)")
    start_time: float = Field(..., description="Segundo de inicio del turno")
    end_time: float = Field(..., description="Segundo de fin del turno")
    text: str = Field(..., description="Texto reconocido en este turno")
    words: Optional[List[WordTimestamp]] = Field(default_factory=list, description="Desglose palabra por palabra")


class DiarizationMetrics(BaseModel):
    total_duration_sec: float = Field(..., description="Duración total del audio en segundos")
    agent_talk_time_sec: float = Field(..., description="Tiempo de habla del agente en segundos")
    customer_talk_time_sec: float = Field(..., description="Tiempo de habla del cliente en segundos")
    agent_talk_ratio: float = Field(..., description="Porcentaje de tiempo de habla del agente (0 a 100)")
    customer_talk_ratio: float = Field(..., description="Porcentaje de tiempo de habla del cliente (0 a 100)")
    silence_time_sec: float = Field(..., description="Tiempo de silencio en la conversación en segundos")


class DiarizationResult(BaseModel):
    call_id: Optional[str] = Field(default=None, description="Identificador único de la llamada")
    channel_mode: str = Field(default="stereo_split", description="Modo de canal (stereo_split o mono_clustering)")
    turns: List[DiarizedTurn] = Field(default_factory=list, description="Lista de turnos de diálogo")
    metrics: DiarizationMetrics = Field(..., description="Métricas de la diarización")
    raw_transcript: Optional[str] = Field(default=None, description="Transcripción completa sin procesar")

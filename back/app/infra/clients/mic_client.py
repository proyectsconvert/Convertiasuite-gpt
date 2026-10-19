import json
import os
import queue
import sys
import uuid
from pathlib import Path

# Permitir ejecucion directa como script agregando la raiz de 'back' al sys.path
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_FILE = Path(__file__).resolve()
BACK_DIR = CURRENT_FILE.parents[3]  # .../back
if str(BACK_DIR) not in sys.path:
    sys.path.insert(0, str(BACK_DIR))

try:
    import sounddevice as sd
    from vosk import KaldiRecognizer, Model
except ImportError as e:
    print(f"\n[ERROR] Falta instalar dependencias requeridas: {e}")
    print("Instala con: pip install sounddevice vosk\n")

from app.domain.enums.speaker import SpeakerRole
from app.domain.events.events import build_event
from app.domain.services.engine import (
    INTEREST_THRESHOLD,
    RISK_THRESHOLD,
    calculate_risk_delta,
    detect_extreme_hostility,
    is_call_closing,
)
from app.domain.services.suggestion_engine import SuggestionEngine

# Configuracion de audio optimizada para Vosk en espanol
SAMPLE_RATE = 16000
BLOCK_SIZE = 4000  # Chunks de 250ms a 16kHz mono int16


def find_vosk_model() -> str:
    """Busca automaticamente el modelo de Vosk en los directorios del proyecto."""
    candidates = [
        BACK_DIR / "app" / "vosk_models" / "vosk-model-small-es-0.42",
        BACK_DIR / "app" / "vosk_models" / "vosk-model-es-0.42",
        BACK_DIR / "app" / "infra" / "clients" / "vosk-model-es-0.42",
        Path("back/app/vosk_models/vosk-model-small-es-0.42"),
        Path("back/app/vosk_models/vosk-model-es-0.42"),
    ]

    for path in candidates:
        if path.exists() and path.is_dir():
            return str(path)

    raise FileNotFoundError(
        "No se encontro ningun modelo Vosk en las rutas esperadas. "
        f"Rutas buscadas: {[str(p) for p in candidates]}"
    )


class RealtimeAudioPipeline:
    """Pipeline integral para DQLE-33 (Captura), DQLE-34 (STT) y DQLE-35 (Reglas)."""

    def __init__(
        self,
        agent_id: str = "agente1",
        campaign_id: str = "desarrolloolivia",
        call_id: str | None = None,
        speaker_role: SpeakerRole = SpeakerRole.AGENT,
    ):
        self.agent_id = agent_id
        self.campaign_id = campaign_id
        self.call_id = call_id or str(uuid.uuid4())
        self.speaker_role = speaker_role

        self.audio_queue: queue.Queue = queue.Queue()
        self.running = False
        self.text_window: list[str] = []

        # Puntuaciones acumuladas de la llamada
        self.accumulated_risk = 0
        self.accumulated_interest = 0

        # Inicializacion de Vosk
        model_path = find_vosk_model()
        print(f"[INFO] Cargando modelo Vosk desde: {model_path} ...")
        self.model = Model(model_path)
        self.recognizer = KaldiRecognizer(self.model, SAMPLE_RATE)
        self.recognizer.SetWords(False)
        print("[INFO] Modelo Vosk cargado exitosamente.")

        # Motor de sugerencias para el copiloto (DQLE-36)
        self.suggestion_engine = SuggestionEngine()

    def _audio_callback(self, indata, frames, time_info, status):
        """Callback de sounddevice: encola el audio capturado sin bloquear."""
        if status:
            print(f"[WARN] Audio stream status: {status}", file=sys.stderr)
        self.audio_queue.put(bytes(indata))

    def process_text_segment(self, text: str):
        """Evalua el texto reconocido con el motor de reglas (DQLE-35)."""
        if not text:
            return

        self.text_window.append(text)
        # Mantener solo las ultimas 6 frases para contexto de ventana deslizante
        if len(self.text_window) > 6:
            self.text_window.pop(0)

        # 1. Calcular riesgo e interes
        risk_delta, interest_delta = calculate_risk_delta(self.text_window)
        self.accumulated_risk += risk_delta
        self.accumulated_interest += interest_delta

        # 2. Detectar agresiones u hostilidad extrema
        hostility = detect_extreme_hostility(text)

        # 3. Detectar cierre de llamada
        closing_phrase = is_call_closing(text)

        # 4. Construir evento estandarizado (DQLE-35)
        event = build_event(
            event_type="transcription_analyzed",
            call_id=self.call_id,
            payload={
                "agent_id": self.agent_id,
                "campaign_id": self.campaign_id,
                "speaker": self.speaker_role.value,
                "transcript": text,
                "risk_delta": risk_delta,
                "interest_delta": interest_delta,
                "hostility_detected": hostility,
                "closing_detected": closing_phrase,
            },
            risk_score=self.accumulated_risk,
            interest_score=self.accumulated_interest,
            call_status="closing" if closing_phrase else "active",
        )

        # 5. Salida en consola informativa para el operador/desarrollador
        print(f"\n[{self.speaker_role.value.upper()}] {text}")
        print(
            f"   [METRICAS] Riesgo acumulado: {self.accumulated_risk}/{RISK_THRESHOLD} | "
            f"Interes acumulado: {self.accumulated_interest}/{INTEREST_THRESHOLD}"
        )

        if hostility:
            print(f"   [ALERTA HOSTILIDAD] Tipo: {hostility[0]} (Severidad: +{hostility[1]})")

        if closing_phrase:
            print(f"   [CIERRE DETECTADO] Frase de cierre detectada: '{closing_phrase}'")

        # 6. Motor de sugerencias reactivo (DQLE-36)
        import asyncio
        try:
            suggestion_event = asyncio.run(
                self.suggestion_engine.evaluate_turn(
                    text=text,
                    text_window=self.text_window,
                    call_id=self.call_id,
                    campaign_id=self.campaign_id,
                    accumulated_risk=self.accumulated_risk,
                    accumulated_interest=self.accumulated_interest,
                )
            )
            if suggestion_event:
                p = suggestion_event["payload"]
                print("\n   ┌" + "─" * 65 + "┐")
                print(f"   │ 💡 [COPILOTO OLIVIA - SUGERENCIA {p['trigger_type'].upper()}]")
                print(f"   │ Protocolo:  {p['protocol_applied']}")
                print(f"   │ Acción:     {p['recommended_action']}")
                print(f"   │ Decir:      \"{p['suggested_phrase']}\"")
                print(f"   │ Certeza:    {int(p['confidence'] * 100)}% ({p['model_used']})")
                print("   └" + "─" * 65 + "┘\n")
        except Exception as e:
            logger_err = f"Error evaluando sugerencia: {e}"
            print(f"   [WARN] {logger_err}")

    def start(self):
        """Inicia el stream de captura de audio y el bucle de transcripcion."""
        self.running = True

        print("\n" + "=" * 60)
        print("[INICIO] PIPELINE DE AUDIO EN TIEMPO REAL (DQLE-33, 34, 35)")
        print(f"   - Agente:     {self.agent_id}")
        print(f"   - Campana:    {self.campaign_id}")
        print(f"   - Call ID:    {self.call_id}")
        print(f"   - Frecuencia: {SAMPLE_RATE} Hz Mono")
        print("   Habla por el microfono. Presiona Ctrl + C para detener...")
        print("=" * 60 + "\n")

        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            dtype="int16",
            channels=1,
            callback=self._audio_callback,
        ):
            try:
                while self.running:
                    try:
                        data = self.audio_queue.get(timeout=0.2)
                    except queue.Empty:
                        continue

                    # Transcripcion continua con Vosk
                    if self.recognizer.AcceptWaveform(data):
                        result = json.loads(self.recognizer.Result())
                        text = result.get("text", "").strip()
                        if text:
                            self.process_text_segment(text)

            except KeyboardInterrupt:
                print("\n[INFO] Deteniendo captura por el usuario...")
            finally:
                self.stop()

    def stop(self):
        """Detiene la captura y procesa cualquier residuo final."""
        self.running = False
        final_res = json.loads(self.recognizer.FinalResult())
        final_text = final_res.get("text", "").strip()
        if final_text:
            self.process_text_segment(final_text)

        print("\n" + "=" * 60)
        print("[FIN] LLAMADA FINALIZADA")
        print(f"   - Riesgo final:   {self.accumulated_risk}")
        print(f"   - Interes final:  {self.accumulated_interest}")
        print("=" * 60 + "\n")


def main():
    # Parámetros listos para recibir desde inConcert o usar mocks de prueba
    pipeline = RealtimeAudioPipeline(
        agent_id="agente1",
        campaign_id="desarrolloolivia",
        speaker_role=SpeakerRole.AGENT,
    )
    pipeline.start()


if __name__ == "__main__":
    main()

import io
import json
import os
import queue
import threading
import wave
from datetime import datetime
from math import gcd
from typing import Optional
import numpy as np
import pyaudiowpatch as pyaudio
from faster_whisper import WhisperModel
from app.infra.clients.ollama_client import OllamaClient


CHUNK         = 3_200
FORMAT        = pyaudio.paInt16
CAPTURE_RATE  = 48_000  

JABRA_MIC_INDEX      = 12   
JABRA_LOOPBACK_INDEX = 14   

mic_queue = queue.Queue()
speaker_queue = queue.Queue()


class AudioRecorder:
    def __init__(self, device_index: int, sample_rate: int, device_name: str, audio_queue: queue.Queue):
        self.device_index = device_index
        self.sample_rate  = sample_rate
        self.device_name  = device_name
        self.queue        = audio_queue
        self.p            = pyaudio.PyAudio()
        self.stream       = None
        self.running      = False
        self.thread       = None

    def _record_loop(self):
        while self.running:
            try:
                data = self.stream.read(CHUNK, exception_on_overflow=False)
                self.queue.put(data)
            except Exception as e:
                print(f"\n[ERROR] En la captura de {self.device_name}: {e}")
                break

    def start(self):
        self.stream = self.p.open(
            format=FORMAT,
            channels=1,
            rate=self.sample_rate,
            input=True,
            input_device_index=self.device_index,
            frames_per_buffer=CHUNK,
        )
        self.running = True
        self.thread = threading.Thread(target=self._record_loop, daemon=True)
        self.thread.start()
        print(f"Capturando en segundo plano: {self.device_name}")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except:
                pass
        self.p.terminate()


class WhisperMeetingRecognizer:
    _model: Optional[WhisperModel] = None

    def __init__(self, model_size: str = "base", rate: int = CAPTURE_RATE):
        self._rate = rate
        self.model = self._load(model_size)
        self.audio_buffer = bytearray()
        self.flush_threshold = rate * 2 * 6 

    @classmethod
    def _load(cls, model_size: str) -> WhisperModel:
        if cls._model is None:
            print(f"Cargando modelo Faster-Whisper ({model_size}) optimizado para CPU...")
            cls._model = WhisperModel(
                model_size, 
                device="cpu", 
                compute_type="int8", 
                cpu_threads=4
            )
            print("Modelo Faster-Whisper cargado con éxito.\n")
        return cls._model

    def process_chunk(self, chunk: bytes) -> str:
        if not chunk:
            return ""
        
        self.audio_buffer.extend(chunk)
        
        if len(self.audio_buffer) < self.flush_threshold:
            return ""
        
        audio_to_process = bytes(self.audio_buffer)
        self.audio_buffer = bytearray()
        
        return self._transcribe_bytes(audio_to_process)

    def flush_final(self) -> str:
        if len(self.audio_buffer) > 0:
            audio_to_process = bytes(self.audio_buffer)
            self.audio_buffer = bytearray()
            return self._transcribe_bytes(audio_to_process)
        return ""

    def _transcribe_bytes(self, audio_bytes: bytes) -> str:
        try:
            audio_data = np.frombuffer(audio_bytes, dtype=np.int16)
            rms = np.sqrt(np.mean(audio_data.astype(np.float32)**2))
            if rms < 200.0:  
                return ""

            wav_io = io.BytesIO()
            with wave.open(wav_io, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2) 
                wf.setframerate(self._rate)
                wf.writeframes(audio_bytes)
            wav_io.seek(0)
            
            segments, info = self.model.transcribe(
                wav_io, 
                language="es", 
                beam_size=3,
                vad_filter=True 
            )
            
            textos = [segment.text.strip() for segment in segments]
            return " ".join(textos).strip()
            
        except Exception as e:
            print(f"\n[ERROR Whisper]: {e}")
            return ""


class TranscriptStorage:
    def __init__(self, transcript_dir: str = "transcripts"):
        self.transcript_dir = transcript_dir
        os.makedirs(transcript_dir, exist_ok=True)

    def create_session(self) -> str:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return os.path.join(self.transcript_dir, f"meeting_{ts}.txt")

    def append_speaker(self, file_path: str, speaker: str, text: str):
        if not text:
            return
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"{ts} [{speaker}] {text}\n")

    def read_full_transcript(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()


class MeetingSummaryGenerator:
    def __init__(self, ollama_client: OllamaClient):
        self.ollama_client = ollama_client

    def generate(self, transcript: str) -> str:
        return self.ollama_client.generate_meeting_summary(transcript=transcript)


if __name__ == "__main__":
    # Inicialización de grabadores nativos
    mic_recorder     = AudioRecorder(JABRA_MIC_INDEX,      CAPTURE_RATE, "Jabra Mic", mic_queue)
    speaker_recorder = AudioRecorder(JABRA_LOOPBACK_INDEX, CAPTURE_RATE, "Jabra Loopback", speaker_queue)

    # Inicialización del reconocedor
    mic_rec     = WhisperMeetingRecognizer(model_size="base", rate=CAPTURE_RATE)
    speaker_rec = WhisperMeetingRecognizer(model_size="base", rate=CAPTURE_RATE)

    storage         = TranscriptStorage()
    transcript_file = storage.create_session()

    mic_recorder.start()
    speaker_recorder.start()

    print("\nGrabando reunión con Faster-Whisper... (Ctrl+C para finalizar)\n")

    try:
        while True:
            while not mic_queue.empty():
                try:
                    mic_raw = mic_queue.get_nowait()
                    text = mic_rec.process_chunk(mic_raw)
                    if text:
                        print(f"[LOCAL]  {text}")
                        storage.append_speaker(transcript_file, "LOCAL", text)
                except queue.Empty:
                    break

            while not speaker_queue.empty():
                try:
                    speaker_raw = speaker_queue.get_nowait()
                    text = speaker_rec.process_chunk(speaker_raw)
                    if text:
                        print(f"[REMOTE] {text}")
                        storage.append_speaker(transcript_file, "REMOTE", text)
                except queue.Empty:
                    break

    except KeyboardInterrupt:
        print("\nFinalizando reunión...")

    finally:
        mic_recorder.stop()
        speaker_recorder.stop()

        # Procesar bloques de audio restantes en los búferes
        final_mic = mic_rec.flush_final()
        if final_mic:
            print(f"[LOCAL]  {final_mic} (residuo)")
            storage.append_speaker(transcript_file, "LOCAL", final_mic)

        final_speaker = speaker_rec.flush_final()
        if final_speaker:
            print(f"[REMOTE] {final_speaker} (residuo)")
            storage.append_speaker(transcript_file, "REMOTE", final_speaker)

        transcript = storage.read_full_transcript(transcript_file)
        print(f"\nTranscripción guardada en:\n{transcript_file}\n")

        if transcript.strip():
            print("Generando resumen con Ollama...")
            try:
                summary = MeetingSummaryGenerator(OllamaClient()).generate(transcript)
                print("\n===== RESUMEN =====\n")
                print(summary)
            except Exception as e:
                print(f"Error al generar el resumen: {e}")
        else:
            print("No se detectó texto legible en la sesión.")

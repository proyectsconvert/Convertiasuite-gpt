import logging
import os
import subprocess
import tempfile
import wave
from typing import List, Optional, Tuple
import numpy as np
try:
    from sklearn.cluster import AgglomerativeClustering
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

from app.domain.entities.diarization import (
    DiarizationResult,
    DiarizationMetrics,
    DiarizedTurn,
    WordTimestamp,
)
from app.domain.enums.speaker import SpeakerRole
from app.services.audio.calls.audio_cleaner_service import AudioCleanerService
from app.services.audio.calls.transcription_service import (
    spk_vectors_for_segments,
    transcribe_utterances_with_spk,
    transcribe_words_from_wav,
)
logger = logging.getLogger(__name__)


class DiarizationService:
    # Frases típicas del agente para decidir qué cluster es el AGENT (ampliar con guiones reales)
    AGENT_CUES = (
        "le habla", "mi nombre es", "ejecutiv", "asesor", "me comunico",
        "indíqueme", "factibilidad", "comuna", "región", "excelente",
    )

    def __init__(self, agent_channel: int = 0, max_pause_seconds: float = 1.0):
        self.agent_channel = agent_channel
        self.max_pause_seconds = max_pause_seconds

    def _probe_audio(self, file_path: str) -> Tuple[int, float]:
        try:
            with wave.open(file_path, "rb") as wf:
                framerate = wf.getframerate()
                nframes = wf.getnframes()
                duration = nframes / float(framerate) if framerate > 0 else 0.0
                return wf.getnchannels(), duration
        except Exception:
            pass

        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "stream=channels,duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ]
        try:
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().splitlines()
            channels = int(output[0]) if len(output) > 0 else 1
            duration = float(output[1]) if len(output) > 1 else 0.0
            return channels, duration
        except Exception as e:
            logger.error(f"Error al obtener información de audio con ffprobe: {e}. Asumiendo canal por defecto (mono).")
            return 1, 0.0

    def _extract_channel(self, input_path: str, channel_idx: int) -> str:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", f"pan=mono|c0=c{channel_idx}",
            "-ar", "16000",
            output_path,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path

    def _convert_to_mono_wav(self, input_path: str) -> str:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", "16000",
            output_path,
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path

    def _group_words_into_turns(
        self, words: List[WordTimestamp], speaker: SpeakerRole
    ) -> List[DiarizedTurn]:
        if not words:
            return []

        turns: List[DiarizedTurn] = []
        current_words: List[WordTimestamp] = [words[0]]

        for word in words[1:]:
            pause = word.start - current_words[-1].end
            if pause > self.max_pause_seconds:
                turns.append(
                    DiarizedTurn(
                        speaker=speaker,
                        start_time=round(current_words[0].start, 2),
                        end_time=round(current_words[-1].end, 2),
                        text=" ".join(w.word for w in current_words),
                        words=list(current_words),
                    )
                )
                current_words = [word]
            else:
                current_words.append(word)

        if current_words:
            turns.append(
                DiarizedTurn(
                    speaker=speaker,
                    start_time=round(current_words[0].start, 2),
                    end_time=round(current_words[-1].end, 2),
                    text=" ".join(w.word for w in current_words),
                    words=list(current_words),
                )
            )
        return turns

    def _cluster_utterances(
        self, utts: List[Tuple[List[WordTimestamp], Optional[List[float]]]]
    ) -> List[DiarizedTurn]:
        """Agrupa enunciados en 2 hablantes por x-vector y asigna el rol por contenido."""
        vecs = [v for _, v in utts if v is not None]
        if len(vecs) < 2:
            logger.warning("[Diarization] Sin x-vectors suficientes; se asigna todo a AGENT.")
            return self._group_words_into_turns(
                [w for ws, _ in utts for w in ws], SpeakerRole.AGENT
            )

        X = np.array(vecs, dtype=float)
        X /= np.linalg.norm(X, axis=1, keepdims=True)
        if HAS_SKLEARN:
            preds = AgglomerativeClustering(
                n_clusters=2, linkage="ward"
            ).fit_predict(X)
        else:
            # Fallback puro NumPy sin dependencias externas
            sim = np.dot(X, X.T)
            i, j = np.unravel_index(np.argmin(sim), sim.shape)
            c0, c1 = X[i].copy(), X[j].copy()
            preds = np.zeros(len(X), dtype=int)
            for _ in range(5):
                preds = (np.dot(X, c1) > np.dot(X, c0)).astype(int)
                if np.any(preds == 0):
                    c0 = np.mean(X[preds == 0], axis=0)
                    c0 /= max(np.linalg.norm(c0), 1e-9)
                if np.any(preds == 1):
                    c1 = np.mean(X[preds == 1], axis=0)
                    c1 /= max(np.linalg.norm(c1), 1e-9)

        cluster_ids = iter(preds)

        # Enunciados sin x-vector heredan el cluster del anterior
        labels: List[int] = []
        prev = 0
        for _, v in utts:
            prev = int(next(cluster_ids)) if v is not None else prev
            labels.append(prev)

        labels = self._smooth_labels(utts, labels)

        score, talk = [0, 0], [0.0, 0.0]
        for (ws, _), lab in zip(utts, labels):
            txt = " ".join(w.word for w in ws)
            score[lab] += sum(c in txt for c in self.AGENT_CUES)
            talk[lab] += ws[-1].end - ws[0].start
        agent_lab = int(np.argmax(score)) if score[0] != score[1] else int(np.argmax(talk))
        logger.info(f"[Diarization] score={score} talk={talk} -> agent=cluster {agent_lab}")

        # Construir turnos fusionando enunciados consecutivos del mismo hablante
        turns: List[DiarizedTurn] = []
        for (ws, _), lab in zip(utts, labels):
            role = SpeakerRole.AGENT if lab == agent_lab else SpeakerRole.CUSTOMER
            txt = " ".join(w.word for w in ws)
            if turns and turns[-1].speaker == role:
                t = turns[-1]
                t.words.extend(ws)
                t.text += " " + txt
                t.end_time = round(ws[-1].end, 2)
            else:
                turns.append(
                    DiarizedTurn(
                        speaker=role,
                        start_time=round(ws[0].start, 2),
                        end_time=round(ws[-1].end, 2),
                        text=txt,
                        words=list(ws),
                    )
                )
        return turns

    def _smooth_labels(self, utts, labels, max_dur: float = 1.0, max_gap: float = 0.5):
        out = list(labels)
        for i in range(1, len(utts) - 1):
            ws, prev_ws, next_ws = utts[i][0], utts[i - 1][0], utts[i + 1][0]
            dur = ws[-1].end - ws[0].start
            gap_in = ws[0].start - prev_ws[-1].end
            gap_out = next_ws[0].start - ws[-1].end
            if (out[i - 1] == out[i + 1] != out[i] and dur < max_dur
                    and gap_in < max_gap and gap_out < max_gap):
                out[i] = out[i - 1]
        return out

    def _micro_segments(self, words, pause: float = 0.3, max_len: float = 4.0):
        segs, cur = [], []
        for w in words:
            if cur and (w.start - cur[-1].end >= pause or w.end - cur[0].start > max_len):
                segs.append(cur)
                cur = []
            cur.append(w)
        if cur:
            segs.append(cur)
        return segs

    def _calculate_metrics(
        self, turns: List[DiarizedTurn], total_duration: float
    ) -> DiarizationMetrics:
        agent_time = sum(
            t.end_time - t.start_time for t in turns if t.speaker == SpeakerRole.AGENT
        )
        customer_time = sum(
            t.end_time - t.start_time for t in turns if t.speaker == SpeakerRole.CUSTOMER
        )
        calc_duration = max(total_duration, (turns[-1].end_time if turns else 0.0), 0.01)
        total_talk = agent_time + customer_time
        silence_time = max(0.0, calc_duration - total_talk)

        return DiarizationMetrics(
            total_duration_sec=round(calc_duration, 2),
            agent_talk_time_sec=round(agent_time, 2),
            customer_talk_time_sec=round(customer_time, 2),
            agent_talk_ratio=round((agent_time / calc_duration) * 100, 2),
            customer_talk_ratio=round((customer_time / calc_duration) * 100, 2),
            silence_time_sec=round(silence_time, 2),
        )

    def diarize_audio_bytes(
        self, audio_bytes: bytes, call_id: str | None = None
    ) -> DiarizationResult:
        audio_bytes = AudioCleanerService.clean_audio_bytes(audio_bytes)
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".audio")
        temp_input.write(audio_bytes)
        temp_input.close()
        extracted_files = [temp_input.name]

        try:
            channels, duration = self._probe_audio(temp_input.name)
            turns: List[DiarizedTurn] = []

            if channels >= 2:
                mode = "stereo_split"
                customer_ch = 1 if self.agent_channel == 0 else 0
                agent_wav = self._extract_channel(temp_input.name, self.agent_channel)
                customer_wav = self._extract_channel(temp_input.name, customer_ch)
                extracted_files.extend([agent_wav, customer_wav])

                agent_words = transcribe_words_from_wav(agent_wav)
                customer_words = transcribe_words_from_wav(customer_wav)

                agent_turns = self._group_words_into_turns(agent_words, SpeakerRole.AGENT)
                customer_turns = self._group_words_into_turns(customer_words, SpeakerRole.CUSTOMER)

                turns = sorted(agent_turns + customer_turns, key=lambda t: t.start_time)
            else:
                mode = "mono_clustering"
                mono_wav = self._convert_to_mono_wav(temp_input.name)
                extracted_files.append(mono_wav)

                words = transcribe_words_from_wav(mono_wav)
                segs = self._micro_segments(words)
                vecs = spk_vectors_for_segments(
                    mono_wav, [(s[0].start, s[-1].end) for s in segs]
                )
                turns = self._cluster_utterances(list(zip(segs, vecs)))

            metrics = self._calculate_metrics(turns, duration)
            raw_text = "\n".join(
                f"[{t.speaker.value.upper()}] ({t.start_time}s - {t.end_time}s): {t.text}"
                for t in turns
            )

            return DiarizationResult(
                call_id=call_id,
                channel_mode=mode,
                turns=turns,
                metrics=metrics,
                raw_transcript=raw_text,
            )
        finally:
            for p in extracted_files:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
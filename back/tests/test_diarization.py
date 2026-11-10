import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.domain.entities.diarization import (
    WordTimestamp,
    DiarizedTurn,
    DiarizationMetrics,
    DiarizationResult,
)
from app.domain.enums.speaker import SpeakerRole
from app.services.audio.calls.diarization_service import DiarizationService


class TestDiarizationService(unittest.TestCase):
    def setUp(self):
        self.service = DiarizationService(agent_channel=0, max_pause_seconds=1.0)

    def test_group_words_into_turns(self):
        words = [
            WordTimestamp(word="hola", start=0.0, end=0.5, speaker=SpeakerRole.AGENT),
            WordTimestamp(word="buenos", start=0.6, end=1.0, speaker=SpeakerRole.AGENT),
            WordTimestamp(word="días", start=1.1, end=1.5, speaker=SpeakerRole.AGENT),
            # Pausa de 2.0s (> max_pause_seconds de 1.0s) -> Nuevo turno
            WordTimestamp(word="¿en", start=3.5, end=3.8, speaker=SpeakerRole.AGENT),
            WordTimestamp(word="qué", start=3.9, end=4.1, speaker=SpeakerRole.AGENT),
            WordTimestamp(word="ayudo?", start=4.2, end=4.8, speaker=SpeakerRole.AGENT),
        ]

        turns = self.service._group_words_into_turns(words, SpeakerRole.AGENT)
        self.assertEqual(len(turns), 2)
        self.assertEqual(turns[0].text, "hola buenos días")
        self.assertEqual(turns[0].start_time, 0.0)
        self.assertEqual(turns[0].end_time, 1.5)
        self.assertEqual(turns[1].text, "¿en qué ayudo?")
        self.assertEqual(turns[1].start_time, 3.5)
        self.assertEqual(turns[1].end_time, 4.8)

    def test_calculate_metrics(self):
        turns = [
            DiarizedTurn(
                speaker=SpeakerRole.AGENT,
                start_time=0.0,
                end_time=6.0,
                text="Turno agente de 6 segundos",
            ),
            DiarizedTurn(
                speaker=SpeakerRole.CUSTOMER,
                start_time=6.5,
                end_time=9.5,
                text="Turno cliente de 3 segundos",
            ),
        ]
        total_duration = 10.0

        metrics = self.service._calculate_metrics(turns, total_duration)
        self.assertIsInstance(metrics, DiarizationMetrics)
        self.assertEqual(metrics.total_duration_sec, 10.0)
        self.assertEqual(metrics.agent_talk_time_sec, 6.0)
        self.assertEqual(metrics.customer_talk_time_sec, 3.0)
        self.assertEqual(metrics.agent_talk_ratio, 60.0)
        self.assertEqual(metrics.customer_talk_ratio, 30.0)
        self.assertEqual(metrics.silence_time_sec, 1.0)


if __name__ == "__main__":
    unittest.main()


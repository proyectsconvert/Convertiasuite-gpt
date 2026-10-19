import sys
from pathlib import Path
BACK_DIR = Path(__file__).resolve().parent.parent
if str(BACK_DIR) not in sys.path:
    sys.path.insert(0, str(BACK_DIR))

import unittest
from unittest.mock import AsyncMock, MagicMock

from app.domain.services.suggestion_engine import SuggestionEngine


class TestSuggestionEngine(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Motor configurado sin cliente LLM (prueba de fallback determinístico ultra-rápido)
        self.engine = SuggestionEngine(ollama_client=None)

    async def test_extreme_hostility_triggers_deescalation(self):
        text = "eres un idiota no me joda"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="ventas-1",
            accumulated_risk=5,
            accumulated_interest=0,
        )

        self.assertIsNotNone(event)
        self.assertEqual(event["event_type"], "call_suggestion")
        payload = event["payload"]
        self.assertEqual(payload["trigger_type"], "hostility")
        self.assertIn(payload["primary_signal"], ["insult", "aggression"])
        self.assertTrue(len(payload["suggested_phrase"]) > 0)
        self.assertIn("respeto", payload["suggested_phrase"].lower())
        self.assertEqual(payload["model_used"], "deterministic_rule_engine")

    async def test_price_objection_triggers_protocol(self):
        text = "ese plan está muy caro, no me alcanza la plata"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="ventas-1",
            accumulated_risk=3,
            accumulated_interest=1,
        )

        self.assertIsNotNone(event)
        payload = event["payload"]
        self.assertEqual(payload["trigger_type"], "objection")
        self.assertEqual(payload["primary_signal"], "price_objection")
        self.assertIn("presupuesto", payload["suggested_phrase"].lower())

    async def test_distrust_objection_triggers_protocol(self):
        text = "eso es una estafa de donde sacaron mi numero"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="cobranza-1",
            accumulated_risk=4,
            accumulated_interest=0,
        )

        self.assertIsNotNone(event)
        payload = event["payload"]
        self.assertEqual(payload["trigger_type"], "objection")
        self.assertEqual(payload["primary_signal"], "distrust")
        self.assertIn("precaución", payload["suggested_phrase"].lower())

    async def test_buying_signal_triggers_close_protocol(self):
        text = "cuanto cuesta y como puedo pagar ahora mismo"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="ventas-1",
            accumulated_risk=0,
            accumulated_interest=8,
        )

        self.assertIsNotNone(event)
        payload = event["payload"]
        self.assertEqual(payload["trigger_type"], "buying_signal")
        self.assertEqual(payload["primary_signal"], "buying_signal")
        self.assertIn("formalizar", payload["suggested_phrase"].lower())

    async def test_closing_call_phrase(self):
        text = "bueno muchas gracias por su tiempo, adios y hasta luego"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="ventas-1",
            accumulated_risk=0,
            accumulated_interest=2,
        )

        self.assertIsNotNone(event)
        payload = event["payload"]
        self.assertEqual(payload["trigger_type"], "closing")
        self.assertEqual(event["call"]["status"], "closing")

    async def test_neutral_speech_does_not_trigger_unnecessary_suggestion(self):
        text = "si señor claro que si yo vivo en bogota colombia"
        event = await self.engine.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-123",
            campaign_id="ventas-1",
            accumulated_risk=0,
            accumulated_interest=0,
        )

        self.assertIsNone(event)

    async def test_llm_inference_integration_success(self):
        mock_ollama = MagicMock()
        mock_ollama.generate_chat = AsyncMock(
            return_value='{"agent_guidance": {"suggested_reply": "Le ofrezco 30% de descuento en su primera mensualidad.", "action": "Ofrecer descuento de bienvenida"}, "confidence": 0.95}'
        )

        engine_with_llm = SuggestionEngine(ollama_client=mock_ollama, model="qwen2.5:7b")

        text = "esta muy costoso no tengo dinero"
        event = await engine_with_llm.evaluate_turn(
            text=text,
            text_window=[text],
            call_id="call-456",
            campaign_id="ventas-1",
        )

        self.assertIsNotNone(event)
        payload = event["payload"]
        self.assertEqual(payload["suggested_phrase"], "Le ofrezco 30% de descuento en su primera mensualidad.")
        self.assertEqual(payload["recommended_action"], "Ofrecer descuento de bienvenida")
        self.assertEqual(payload["model_used"], "qwen2.5:7b")


if __name__ == "__main__":
    unittest.main()

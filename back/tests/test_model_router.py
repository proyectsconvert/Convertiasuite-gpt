import os
import sys
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.model_router import build_routing_context, route_model


class TestModelRouter(unittest.IsolatedAsyncioTestCase):
    async def test_generic_chat_uses_default(self):
        model_key = await route_model("quien eres", intent_classifier=None)
        self.assertEqual(model_key, "default")

    async def test_generic_chat_with_landing_history_uses_default(self):
        history = [
            {"role": "user", "content": "Quiero una landing page"},
            {"role": "assistant", "content": "Puedo ayudarte con HTML y Tailwind"},
        ]
        model_key = await route_model(
            build_routing_context("quien eres", history),
            intent_classifier=None,
        )
        self.assertEqual(model_key, "default")

    async def test_generic_chat_with_additional_landing_text_is_not_default(self):
        model_key = await route_model(
            "hola, necesito una landing page", intent_classifier=None
        )
        self.assertEqual(model_key, "landing")

    async def test_landing_keyword_uses_landing(self):
        model_key = await route_model(
            "Necesito una landing page para mi producto", intent_classifier=None
        )
        self.assertEqual(model_key, "landing")

    async def test_message_with_code_keyword_uses_code(self):
        model_key = await route_model(
            "Tengo un bug en mi código Python", intent_classifier=None
        )
        self.assertEqual(model_key, "code")

    async def test_short_message_uses_last_user_history_for_routing(self):
        history = [
            {"role": "user", "content": "Necesito una landing page para mi producto"},
            {"role": "assistant", "content": "Puedo ayudarte con eso"},
        ]
        model_key = await route_model(
            "si",
            intent_classifier=None,
            history=history,
        )
        self.assertEqual(model_key, "landing")

    async def test_normal_question_with_ui_substring_uses_default(self):
        # "equipos" contains "ui" as substring, but it shouldn't trigger "landing"
        model_key = await route_model(
            "como creo equipos de trabajo?",
            intent_classifier=None,
        )
        self.assertEqual(model_key, "default")

    async def test_landing_with_word_boundary_uses_landing(self):
        model_key = await route_model(
            "necesito diseñar una landing",
            intent_classifier=None,
        )
        self.assertEqual(model_key, "landing")


if __name__ == "__main__":
    unittest.main()

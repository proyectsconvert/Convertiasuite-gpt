import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.external import ExternalChatRequest, external_chat


class TestExternalChat(unittest.IsolatedAsyncioTestCase):
    async def test_external_chat_uses_valid_internal_role(self):
        request = ExternalChatRequest(
            end_user_id="cliente-123",
            message="Hola",
        )

        async def streaming_response():
            yield "Respuesta de prueba"

        with patch("app.api.external.get_llm_provider") as mock_llm_provider, \
             patch("app.api.external.get_memory_repo") as mock_memory_repo, \
             patch("app.api.external.get_document_manager") as mock_document_manager, \
             patch("app.api.external.get_intent_classifier") as mock_intent_classifier, \
             patch("app.api.external.get_rag_repository") as mock_rag_repository, \
             patch("app.api.external.get_campaign_repository") as mock_campaign_repository, \
             patch("app.api.external.process_chat", new_callable=AsyncMock) as mock_process_chat, \
             patch("app.api.external.classify_query_safely", new_callable=AsyncMock) as mock_classify, \
             patch("app.api.external.log_agent_query", new_callable=AsyncMock) as mock_log_query:
            mock_process_chat.return_value = (
                streaming_response(),
                "model",
                "session-123",
                {"used": False, "sources": []},
            )
            mock_classify.return_value = "greeting"

            response = await external_chat(
                request,
                current_tenant={"id": "tenant-123"},
                llm_provider=mock_llm_provider,
                memory_repo=mock_memory_repo,
                document_manager=mock_document_manager,
                intent_classifier=mock_intent_classifier,
                rag_repository=mock_rag_repository,
                campaign_repository=mock_campaign_repository,
            )

        self.assertEqual(response["status"], "success")
        mock_process_chat.assert_awaited_once()
        internal_request = mock_process_chat.call_args.args[0]
        self.assertEqual(internal_request.user_role, "default")
        mock_log_query.assert_not_called()


if __name__ == "__main__":
    unittest.main()

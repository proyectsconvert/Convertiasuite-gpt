import os
import sys
import types
import unittest
from unittest.mock import MagicMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class TestRagAccessFiltering(unittest.IsolatedAsyncioTestCase):
    async def test_search_applies_access_filter_to_metadata(self):
        fake_supabase_client_module = types.ModuleType("app.infra.clients.supabase_client")
        fake_supabase_client_module.SupabaseClient = object
        sys.modules["app.infra.clients.supabase_client"] = fake_supabase_client_module

        fake_rag_repo_module = types.ModuleType("app.domain.interfaces.rag_repository")

        class FakeIRagRepository:
            pass

        fake_rag_repo_module.IRagRepository = FakeIRagRepository
        sys.modules["app.domain.interfaces.rag_repository"] = fake_rag_repo_module

        from app.rag.supabase_rag_repository import SupabaseRagRepository

        fake_client = MagicMock()
        fake_rpc = MagicMock()
        fake_rpc.return_value.execute.return_value = MagicMock(
            data=[
                {"content": "public", "metadata": {"scope": "public"}},
                {"content": "private owned", "metadata": {"scope": "private", "user_id": "u1"}},
                {"content": "department same", "metadata": {"scope": "department", "department_id": "dep1"}},
                {"content": "campaign same", "metadata": {"scope": "public", "campaign_id": "camp1"}},
                {"content": "private other", "metadata": {"scope": "private", "user_id": "u2"}},
                {"content": "department other", "metadata": {"scope": "department", "department_id": "dep2"}},
                {"content": "campaign other", "metadata": {"scope": "public", "campaign_id": "camp2"}},
            ]
        )
        fake_client.db.rpc = fake_rpc

        repo = SupabaseRagRepository(fake_client)
        results = await repo.search(
            [0.1, 0.2, 0.3],
            k=5,
            access_context={
                "user_id": "u1",
                "department_id": "dep1",
                "campaign_id": "camp1",
            },
        )

        self.assertEqual([r["content"] for r in results], [
            "public",
            "private owned",
            "department same",
            "campaign same",
        ])


if __name__ == "__main__":
    unittest.main()

# app/infra/repositories/supabase_rag_repository.py
import logging

from app.domain.interfaces.rag_repository import IRagRepository
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SupabaseRagRepository(IRagRepository):
    def __init__(self, supabase_client: SupabaseClient):
        self.client = supabase_client
        self.table_name = "rag_chunks"

    async def get_pending_sources(self) -> list[dict]:
        try:
            response = self.client.db.rpc("get_pending_rag_sources", {}).execute()
            return response.data or []
        except Exception as e:
            logger.error("Error fetching pending RAG sources: %s", str(e))
            return []

    async def replace_chunks(
        self,
        source_id: str,
        chunks: list[tuple[str, dict, list[float]]],
        source_updated_at: str,
    ) -> None:
        try:
            self.client.db.table(self.table_name).delete().eq(
                "source_id", source_id
            ).execute()

            rows = [
                {
                    "source_id": source_id,
                    "chunk_index": i,
                    "content": text,
                    "metadata": metadata,
                    "embedding": embedding,
                    "source_updated_at": source_updated_at,
                }
                for i, (text, metadata, embedding) in enumerate(chunks)
            ]

            if rows:
                self.client.db.table(self.table_name).insert(rows).execute()

            logger.info("RAG chunks replaced source_id=%s count=%d", source_id, len(rows))

        except Exception as e:
            logger.error("Error replacing RAG chunks source_id=%s error=%s", source_id, str(e))
            raise

    async def search(self, query_embedding: list[float], k: int = 5) -> list[dict]:
        try:
            response = self.client.db.rpc(
                "match_rag_chunks",
                {"query_embedding": query_embedding, "match_count": k},
            ).execute()
            return response.data or []
        except Exception as e:
            logger.error("Error searching RAG chunks: %s", str(e))
            return []
import logging

from app.domain.interfaces.rag_repository import IRagRepository
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SupabaseRagRepository(IRagRepository):
    def __init__(self, supabase_client: SupabaseClient):
        self.client = supabase_client
        self.table_name = "rag_chunks"

    @staticmethod
    def _filter_access(results: list[dict], access_context: dict | None = None) -> list[dict]:
        if not results:
            return []

        if not access_context:
            return [r for r in results if (r.get("metadata") or {}).get("scope") in (None, "public")]

        user_id = str((access_context or {}).get("user_id") or "")
        department_id = str((access_context or {}).get("department_id") or "")
        campaign_id = str((access_context or {}).get("campaign_id") or "")

        allowed = []
        for row in results:
            metadata = row.get("metadata") or {}
            scope = metadata.get("scope") or "private"

            if campaign_id:
                chunk_campaign_id = str(metadata.get("campaign_id") or "")
                if chunk_campaign_id and chunk_campaign_id != campaign_id:
                    continue

            if scope == "public":
                allowed.append(row)
                continue

            if scope == "private":
                if metadata.get("user_id") == user_id:
                    allowed.append(row)
                continue

            if scope == "department":
                if metadata.get("department_id") == department_id:
                    allowed.append(row)
                continue

            if scope == "campaign":
                if metadata.get("campaign_id") == campaign_id:
                    allowed.append(row)
                continue

            # fallback privado con owner
            if metadata.get("user_id") == user_id:
                allowed.append(row)

        return allowed

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

    async def search(
        self,
        query_embedding: list[float],
        k: int = 5,
        access_context: dict | None = None,
    ) -> list[dict]:
        try:
            response = self.client.db.rpc(
                "match_rag_chunks",
                {"query_embedding": query_embedding, "match_count": k},
            ).execute()
            rows = response.data or []
            return self._filter_access(rows, access_context)
        except Exception as e:
            logger.error("Error searching RAG chunks: %s", str(e))
            return []
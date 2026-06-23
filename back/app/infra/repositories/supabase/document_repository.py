import json
import logging
from typing import Optional
from uuid import UUID
from app.domain.entities.document import Document, DocumentType, ParsedContent
from app.domain.interfaces.document_repository import IDocumentRepository
from app.infra.clients.supabase_client import SupabaseClient


class MissingDocumentStorageError(Exception):
    """Custom exception to indicate that the document storage is unavailable."""

logger = logging.getLogger(__name__)


class SupabaseDocumentRepository(IDocumentRepository):
    def __init__(self, supabase_client: SupabaseClient):
        self.client = supabase_client
        self.table_name = "documents"

    async def save(self, document: Document) -> UUID:
        try:
            parsed_content_json = self._serialize_parsed_content(
                document.parsed_content
            )

            data = {
                "id": str(document.id),
                "type": document.type.value,
                "filename": document.filename,
                "parsed_content": parsed_content_json,
                "session_id": str(document.session_id) if document.session_id else None,
                "user_id": str(document.user_id),
                "embeddings": json.dumps(document.embeddings),
                "tags": document.tags,
                "metadata": json.dumps(document.metadata),
                "created_at": document.created_at.isoformat(),
                "updated_at": document.updated_at.isoformat(),
            }

            self.client.db.table(self.table_name).insert(data).execute()
            logger.info(f"Document saved: {document.id}")
            return document.id

        except Exception as e:
            if self._is_missing_document_storage_error(e):
                logger.warning(
                    "Documents table is unavailable; skipping document persistence. %s",
                    str(e),
                )
                return document.id

            logger.error(f"Error saving document: {str(e)}")
            raise

    async def get_by_id(self, document_id: UUID) -> Optional[Document]:
        try:
            response = (
                self.client.db.table(self.table_name)
                .select("*")
                .eq("id", str(document_id))
                .execute()
            )

            if response.data:
                return self._row_to_document(response.data[0])
            return None

        except Exception as e:
            logger.error(f"Error retrieving document: {str(e)}")
            return None

    async def get_by_session(self, session_id: UUID) -> list[Document]:
        try:
            response = (
                self.client.db.table(self.table_name)
                .select("*")
                .eq("session_id", str(session_id))
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
            if self._is_missing_document_storage_error(e):
                logger.info(
                    session_id,
                )
                return []

            logger.error(f"Error retrieving session documents: {str(e)}")
            return []

    async def get_by_user(self, user_id: UUID, limit: int = 50) -> list[Document]:
        try:
            response = (
                self.client.db.table(self.table_name)
                .select("*")
                .eq("user_id", str(user_id))
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
            if self._is_missing_document_storage_error(e):
                logger.info(
                    user_id,
                )
                return []

            logger.error(f"Error retrieving user documents: {str(e)}")
            return []

    async def search_by_type(
        self,
        session_id: UUID,
        document_type: DocumentType,
    ) -> list[Document]:
        """Search documents by type in a session."""
        try:
            response = (
                self.client.db.table(self.table_name)
                .select("*")
                .eq("session_id", str(session_id))
                .eq("type", document_type.value)
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
            if self._is_missing_document_storage_error(e):
                logger.info(
                    "Documents table is unavailable; returning no documents for type search",
                )
                return []

            logger.error(f"Error searching documents: {str(e)}")
            return []

    async def delete(self, document_id: UUID, user_id: UUID) -> bool:
        try:
            doc = await self.get_by_id(document_id)
            if not doc or doc.user_id != user_id:
                logger.warning(f"Unauthorized delete attempt: {document_id}")
                return False

            self.client.db.table(self.table_name).delete().eq(
                "id", str(document_id)
            ).execute()

            logger.info(f"Document deleted: {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return False

    async def update_embeddings(self, document_id: UUID, embeddings: dict) -> bool:
        try:
            self.client.db.table(self.table_name).update(
                {"embeddings": json.dumps(embeddings)}
            ).eq("id", str(document_id)).execute()

            logger.info(f"Embeddings updated: {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating embeddings: {str(e)}")
            return False

    @staticmethod
    def _is_missing_document_storage_error(error: Exception) -> bool:
        message = str(error).lower()
        code = getattr(error, "code", None)
        return (
            code in {"PGRST205", "PGRST202", "PGRST116"}
            or "could not find the table" in message
            or "relation" in message
            and "does not exist" in message
            or "schema cache" in message
        )

    @staticmethod
    def _serialize_parsed_content(content: ParsedContent) -> str:
        content_dict = {
            "text": content.text,
            "sections": [
                {
                    "title": s.title,
                    "content": s.content,
                    "level": s.level,
                    "metadata": s.metadata,
                    "embeddings": s.embeddings,
                }
                for s in content.sections
            ],
            "tables": [
                {
                    "headers": t.headers,
                    "rows": t.rows,
                    "name": t.name,
                    "metadata": t.metadata,
                }
                for t in content.tables
            ],
            "images": [
                {
                    "name": img.name,
                    "page_number": img.page_number,
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                }
                for img in content.images
            ],
            "metadata": content.metadata,
        }
        return json.dumps(content_dict)

    @staticmethod
    def _deserialize_parsed_content(json_str: str) -> ParsedContent:
        from app.domain.entities.document import (
            ImageMetadata,
            Section,
            Table,
        )

        data = json.loads(json_str)

        sections = [
            Section(
                title=s["title"],
                content=s["content"],
                level=s.get("level", 1),
                metadata=s.get("metadata", {}),
                embeddings=s.get("embeddings"),
            )
            for s in data.get("sections", [])
        ]

        tables = [
            Table(
                headers=t["headers"],
                rows=t["rows"],
                name=t.get("name"),
                metadata=t.get("metadata", {}),
            )
            for t in data.get("tables", [])
        ]

        images = [
            ImageMetadata(
                name=img["name"],
                page_number=img.get("page_number"),
                width=img.get("width"),
                height=img.get("height"),
                format=img.get("format", "unknown"),
            )
            for img in data.get("images", [])
        ]

        return ParsedContent(
            text=data["text"],
            sections=sections,
            tables=tables,
            images=images,
            metadata=data.get("metadata", {}),
        )

    @staticmethod
    def _row_to_document(row: dict) -> Document:
        from datetime import datetime

        return Document(
            id=UUID(row["id"]),
            type=DocumentType(row["type"]),
            filename=row["filename"],
            parsed_content=SupabaseDocumentRepository._deserialize_parsed_content(
                row["parsed_content"]
            ),
            session_id=UUID(row["session_id"]) if row.get("session_id") else None,
            user_id=UUID(row["user_id"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            embeddings=json.loads(row.get("embeddings", "{}")),
            tags=row.get("tags", []),
            metadata=json.loads(row.get("metadata", "{}")),
        )

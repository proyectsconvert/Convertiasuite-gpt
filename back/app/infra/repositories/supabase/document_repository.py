"""
Supabase document repository.
Persistent layer for document storage and retrieval.
"""

import json
import logging
from typing import Optional
from uuid import UUID

from app.domain.entities.document import Document, DocumentType, ParsedContent
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SupabaseDocumentRepository:
    """
    Repository for persisting documents in Supabase.
    Handles serialization/deserialization of complex entities.
    """

    def __init__(self, supabase_client: SupabaseClient):
        self.client = supabase_client
        self.table_name = "documents"

    async def save(self, document: Document) -> UUID:
        """
        Persist document to Supabase.

        Returns:
            Document ID
        """
        try:
            # Serialize ParsedContent
            parsed_content_json = self._serialize_parsed_content(
                document.parsed_content
            )

            data = {
                "id": str(document.id),
                "type": document.type.value,
                "filename": document.filename,
                "parsed_content": parsed_content_json,
                "session_id": str(document.session_id),
                "user_id": str(document.user_id),
                "embeddings": json.dumps(document.embeddings),
                "tags": document.tags,
                "metadata": json.dumps(document.metadata),
                "created_at": document.created_at.isoformat(),
                "updated_at": document.updated_at.isoformat(),
            }

            response = (
                self.client.supabase.table(self.table_name).insert(data).execute()
            )
            logger.info(f"Document saved: {document.id}")
            return document.id

        except Exception as e:
            logger.error(f"Error saving document: {str(e)}")
            raise

    async def get_by_id(self, document_id: UUID) -> Optional[Document]:
        """Retrieve document by ID."""
        try:
            response = (
                self.client.supabase.table(self.table_name)
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
        """Get all documents in a session."""
        try:
            response = (
                self.client.supabase.table(self.table_name)
                .select("*")
                .eq("session_id", str(session_id))
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
            logger.error(f"Error retrieving session documents: {str(e)}")
            return []

    async def get_by_user(self, user_id: UUID, limit: int = 50) -> list[Document]:
        """Get user's recent documents."""
        try:
            response = (
                self.client.supabase.table(self.table_name)
                .select("*")
                .eq("user_id", str(user_id))
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
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
                self.client.supabase.table(self.table_name)
                .select("*")
                .eq("session_id", str(session_id))
                .eq("type", document_type.value)
                .execute()
            )

            return [self._row_to_document(row) for row in response.data]

        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []

    async def delete(self, document_id: UUID, user_id: UUID) -> bool:
        """Delete document with ownership check."""
        try:
            # Verify ownership
            doc = await self.get_by_id(document_id)
            if not doc or doc.user_id != user_id:
                logger.warning(f"Unauthorized delete attempt: {document_id}")
                return False

            self.client.supabase.table(self.table_name).delete().eq(
                "id", str(document_id)
            ).execute()

            logger.info(f"Document deleted: {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return False

    async def update_embeddings(self, document_id: UUID, embeddings: dict) -> bool:
        """Update document embeddings."""
        try:
            self.client.supabase.table(self.table_name).update(
                {"embeddings": json.dumps(embeddings)}
            ).eq("id", str(document_id)).execute()

            logger.info(f"Embeddings updated: {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating embeddings: {str(e)}")
            return False

    @staticmethod
    def _serialize_parsed_content(content: ParsedContent) -> str:
        """Serialize ParsedContent to JSON."""
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
        """Deserialize ParsedContent from JSON."""
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
        """Convert Supabase row to Document entity."""
        from datetime import datetime

        return Document(
            id=UUID(row["id"]),
            type=DocumentType(row["type"]),
            filename=row["filename"],
            parsed_content=SupabaseDocumentRepository._deserialize_parsed_content(
                row["parsed_content"]
            ),
            session_id=UUID(row["session_id"]),
            user_id=UUID(row["user_id"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            embeddings=json.loads(row.get("embeddings", "{}")),
            tags=row.get("tags", []),
            metadata=json.loads(row.get("metadata", "{}")),
        )

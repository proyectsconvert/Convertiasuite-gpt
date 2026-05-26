"""
Document management service.
Orchestrates document processing, persistence, and context extraction.
"""

import logging
from uuid import UUID, uuid4
from datetime import datetime, UTC

from app.domain.entities.document import Document, DocumentType
from app.domain.interfaces.document_processor import DocumentProcessorFactory
from app.infra.repositories.supabase.document_repository import (
    SupabaseDocumentRepository,
)

logger = logging.getLogger(__name__)


class DocumentManager:
    """
    Service for managing document lifecycle.
    Handles upload, parsing, persistence, and context extraction.
    """

    def __init__(
        self,
        processor_factory: DocumentProcessorFactory,
        document_repository: SupabaseDocumentRepository,
    ):
        self.processor_factory = processor_factory
        self.document_repository = document_repository

    async def process_document(
        self,
        file_content: bytes,
        filename: str,
        session_id: UUID,
        user_id: UUID,
        tags: list[str] | None = None,
        metadata: dict | None = None,
    ) -> Document | None:
        """
        Process a file and persist it.

        Steps:
        1. Determine document type
        2. Parse using appropriate processor
        3. Create Document entity
        4. Persist to repository

        Args:
            file_content: File bytes
            filename: Original filename
            session_id: Associated session
            user_id: Document owner
            tags: Optional tags
            metadata: Optional custom metadata

        Returns:
            Persisted Document entity or None if processing failed
        """
        try:
            # Get processor
            processor = self.processor_factory.get_processor_by_extension(filename)
            if not processor:
                logger.warning(f"Unsupported file type: {filename}")
                return None

            # Parse content
            parsed_content = await processor.parse(file_content, filename)
            if not parsed_content:
                logger.warning(f"Failed to parse: {filename}")
                return None

            # Create document entity
            document = Document(
                id=uuid4(),
                type=processor.supported_type,
                filename=filename,
                parsed_content=parsed_content,
                session_id=session_id,
                user_id=user_id,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                tags=tags or [],
                metadata=metadata or {},
            )

            # Persist
            await self.document_repository.save(document)
            logger.info(f"Document processed and saved: {document.id}")
            return document

        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}")
            return None

    async def get_context_for_session(
        self,
        session_id: UUID,
        limit: int = 5,
    ) -> str:
        """
        Get relevant document context for a session.
        Used to augment chat context with document information.

        Args:
            session_id: Session to get context for
            limit: Max documents to include

        Returns:
            Formatted context string
        """
        try:
            documents = await self.document_repository.get_by_session(session_id)
            documents = documents[:limit]

            if not documents:
                return ""

            context_parts = ["## Document Context"]

            for doc in documents:
                context_parts.append(f"\n### {doc.filename}")
                context_parts.append(
                    doc.parsed_content.to_searchable_text()[:500] + "..."
                )

            return "\n".join(context_parts)

        except Exception as e:
            logger.error(f"Context extraction failed: {str(e)}")
            return ""

    async def get_relevant_context(
        self,
        session_id: UUID,
        query: str,
        limit_chunks: int = 3,
    ) -> str:
        """
        Get relevant document chunks for a session based on similarity to query.
        """
        try:
            documents = await self.document_repository.get_by_session(session_id)
            if not documents:
                return ""

            chunks = []
            for doc in documents:
                text = doc.parsed_content.to_searchable_text()
                paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                for p in paragraphs:
                    chunks.append((doc.filename, p))

            if not chunks:
                return ""

            query_words = set(query.lower().split())
            scored_chunks = []
            for filename, chunk in chunks:
                chunk_words = set(chunk.lower().split())
                overlap = len(query_words.intersection(chunk_words))
                score = overlap / len(query_words) if query_words else 0
                scored_chunks.append((score, filename, chunk))

            scored_chunks.sort(key=lambda x: x[0], reverse=True)

            relevant_chunks = []
            for score, filename, chunk in scored_chunks[:limit_chunks]:
                if score > 0 or not relevant_chunks:
                    trimmed_chunk = chunk if len(chunk) <= 1500 else chunk[:1500] + "..."
                    relevant_chunks.append(f"### Archivo: {filename}\n{trimmed_chunk}")

            if not relevant_chunks:
                return ""

            return "## DOCUMENTOS RELACIONADOS (RETRIEVED CONTEXT):\n\n" + "\n\n".join(relevant_chunks)

        except Exception as e:
            logger.error(f"Contextual retrieval failed: {str(e)}")
            return ""

    async def search_documents(
        self,
        session_id: UUID,
        query: str,
        document_type: DocumentType | None = None,
    ) -> list[Document]:
        """
        Search documents in a session.
        Basic text search on parsed content.

        Args:
            session_id: Session to search in
            query: Search query
            document_type: Optional type filter

        Returns:
            Matching documents
        """
        try:
            if document_type:
                documents = await self.document_repository.search_by_type(
                    session_id, document_type
                )
            else:
                documents = await self.document_repository.get_by_session(session_id)

            # Basic text search
            query_lower = query.lower()
            results = []

            for doc in documents:
                search_text = doc.parsed_content.to_searchable_text().lower()
                if query_lower in search_text:
                    results.append(doc)

            return results

        except Exception as e:
            logger.error(f"Document search failed: {str(e)}")
            return []

    async def delete_document(
        self,
        document_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete document if user owns it."""
        try:
            return await self.document_repository.delete(document_id, user_id)
        except Exception as e:
            logger.error(f"Document deletion failed: {str(e)}")
            return False

    def get_supported_types(self) -> list[DocumentType]:
        """Get list of supported document types."""
        return self.processor_factory.supported_types

    def get_supported_extensions(self) -> list[str]:
        """Get list of supported file extensions."""
        return self.processor_factory.supported_extensions

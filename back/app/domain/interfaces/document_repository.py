from abc import ABC, abstractmethod
from typing import List, Optional


class IDocumentRepository(ABC):
    """Interface for document storage and retrieval.

    Responsibilities:
    - Persist a document record linked to a chat session.
    - Store document chunks for later similarity search.
    - Retrieve relevant chunks based on a query.
    """

    @abstractmethod
    async def save_document(
        self,
        session_id: str,
        file_name: str,
        mime_type: Optional[str] = None,
        file_size: Optional[int] = None,
        extracted_text: Optional[str] = None,
    ) -> str:
        """Save a document and return its document_id."""
        raise NotImplementedError

    @abstractmethod
    async def save_chunks(
        self,
        document_id: str,
        chunks: List[dict],
    ) -> None:
        """Persist a list of chunk dictionaries.
        Each chunk dict should contain at least ``content`` and optional metadata.
        """
        raise NotImplementedError

    @abstractmethod
    async def search_chunks(
        self,
        session_id: str,
        query: str,
        limit: int = 5,
    ) -> List[dict]:
        """Return the most relevant chunks for a query within a session.
        The return format is a list of dicts with ``content`` and any extra metadata.
        """
        raise NotImplementedError

from typing import Optional
from uuid import UUID
from app.domain.entities.document import Document, DocumentType


class IDocumentRepository(ABC):

    @abstractmethod
    async def save(self, document: Document) -> UUID:
        pass

    @abstractmethod
    async def get_by_id(self, document_id: UUID) -> Optional[Document]:
        pass

    @abstractmethod
    async def get_by_session(self, session_id: UUID) -> list[Document]:
        pass

    @abstractmethod
    async def get_by_user(self, user_id: UUID, limit: int = 50) -> list[Document]:
        pass

    @abstractmethod
    async def search_by_type(
        self,
        session_id: UUID,
        document_type: DocumentType,
    ) -> list[Document]:
        pass

    @abstractmethod
    async def delete(self, document_id: UUID, user_id: UUID) -> bool:
        pass

    @abstractmethod
    async def update_embeddings(self, document_id: UUID, embeddings: dict) -> bool:
        pass

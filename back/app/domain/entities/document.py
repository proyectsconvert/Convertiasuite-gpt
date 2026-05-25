"""
Domain entities for document processing.
Core document representation following hexagonal architecture.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID


class DocumentType(Enum):
    """Supported document types."""

    PDF = "pdf"
    EXCEL = "excel"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    JSON = "json"


@dataclass
class ImageMetadata:
    """Metadata for extracted images."""

    name: str
    page_number: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: str = "unknown"


@dataclass
class Table:
    """Represents a table in the document."""

    headers: list[str]
    rows: list[list[str]]
    name: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    @property
    def row_count(self) -> int:
        return len(self.rows)

    @property
    def column_count(self) -> int:
        return len(self.headers) if self.headers else 0


@dataclass
class Section:
    """Represents a hierarchical section of content."""

    title: str
    content: str
    level: int = 1  # Hierarchy level (1=main, 2=subsection, etc)
    metadata: dict = field(default_factory=dict)
    embeddings: Optional[dict] = None

    @property
    def word_count(self) -> int:
        return len(self.content.split())


@dataclass
class ParsedContent:
    """Complete parsed content from a document."""

    text: str
    sections: list[Section] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    images: list[ImageMetadata] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_searchable_text(self) -> str:
        """
        Combine all text content for full-text search.
        """
        parts = [self.text]

        for section in self.sections:
            parts.append(f"### {section.title}\n{section.content}")

        for table in self.tables:
            header_str = " | ".join(table.headers)
            rows_str = "\n".join([" | ".join(row) for row in table.rows])
            parts.append(f"Table: {table.name or 'Unnamed'}\n{header_str}\n{rows_str}")

        return "\n\n".join(parts)

    @property
    def word_count(self) -> int:
        return len(self.to_searchable_text().split())


@dataclass
class Document:
    """
    Core document entity.
    Represents a file processed and stored in the system.
    """

    id: UUID
    type: DocumentType
    filename: str
    parsed_content: ParsedContent
    session_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    embeddings: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    @property
    def file_size_bytes(self) -> int:
        """Estimate file size from content."""
        return len(self.parsed_content.to_searchable_text().encode())


@dataclass
class DocumentSearchResult:
    """Result from document search operation."""

    document: Document
    matching_sections: list[Section]
    relevance_score: float  # 0.0 to 1.0
    matched_text: str

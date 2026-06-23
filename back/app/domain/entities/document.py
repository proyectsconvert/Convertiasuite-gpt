from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID


class DocumentType(Enum):
    PDF = "pdf"
    EXCEL = "excel"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    MD = "md"
    JSON = "json"


@dataclass
class ImageMetadata:
    name: str
    page_number: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: str = "unknown"


@dataclass
class Table:
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
    title: str
    content: str
    level: int = 1
    metadata: dict = field(default_factory=dict)
    embeddings: Optional[dict] = None

    @property
    def word_count(self) -> int:
        return len(self.content.split())


@dataclass
class ParsedContent:
    text: str
    sections: list[Section] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    images: list[ImageMetadata] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_searchable_text(self) -> str:
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
    id: UUID
    type: DocumentType
    filename: str
    parsed_content: ParsedContent
    session_id: UUID | None
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    embeddings: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    @property
    def file_size_bytes(self) -> int:
        return len(self.parsed_content.to_searchable_text().encode())


@dataclass
class DocumentSearchResult:
    document: Document
    matching_sections: list[Section]
    relevance_score: float
    matched_text: str

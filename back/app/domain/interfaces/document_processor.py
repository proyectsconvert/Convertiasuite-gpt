"""
Document processing interface and factory.
Defines contracts for document processors - core to hexagonal architecture.
"""

from abc import ABC, abstractmethod
from typing import Optional

from app.domain.entities.document import DocumentType, ParsedContent


class IDocumentProcessor(ABC):
    """
    Contract for document processors.
    Each processor handles one document type.
    """

    @property
    @abstractmethod
    def supported_type(self) -> DocumentType:
        """Document type this processor handles."""
        pass

    @property
    @abstractmethod
    def supported_extensions(self) -> list[str]:
        """File extensions this processor supports (e.g., ['.pdf'])."""
        pass

    @abstractmethod
    async def parse(self, file_content: bytes, filename: str) -> ParsedContent:
        """
        Parse file content into structured format.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            ParsedContent with extracted text, sections, tables, etc

        Raises:
            ValueError: If file format is invalid
            IOError: If processing fails
        """
        pass

    @abstractmethod
    def get_metadata(self, file_content: bytes) -> dict:
        """
        Extract file metadata without full parsing.
        Used for preview/validation.
        """
        pass


class DocumentProcessorFactory:
    """
    Factory for document processors.
    Manages registration and resolution of processors by type/extension.
    """

    def __init__(self):
        self._processors_by_type: dict[DocumentType, IDocumentProcessor] = {}
        self._processors_by_extension: dict[str, IDocumentProcessor] = {}

    def register(self, processor: IDocumentProcessor) -> None:
        """Register a processor for its supported type and extensions."""
        self._processors_by_type[processor.supported_type] = processor

        for ext in processor.supported_extensions:
            normalized_ext = ext.lower().lstrip(".")
            self._processors_by_extension[normalized_ext] = processor

    def get_processor(
        self, document_type: DocumentType
    ) -> Optional[IDocumentProcessor]:
        """Get processor by document type."""
        return self._processors_by_type.get(document_type)

    def get_processor_by_extension(self, filename: str) -> Optional[IDocumentProcessor]:
        """Get processor by file extension."""
        if not filename or "." not in filename:
            return None

        ext = filename.rsplit(".", 1)[1].lower()
        return self._processors_by_extension.get(ext)

    def is_supported(self, filename: str) -> bool:
        """Check if file extension is supported."""
        return self.get_processor_by_extension(filename) is not None

    @property
    def supported_types(self) -> list[DocumentType]:
        """List all supported document types."""
        return list(self._processors_by_type.keys())

    @property
    def supported_extensions(self) -> list[str]:
        """List all supported file extensions."""
        return list(self._processors_by_extension.keys())

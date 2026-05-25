"""
Plain text document processor.
Simple processor for TXT files.
"""

import logging

from app.domain.entities.document import (
    DocumentType,
    ParsedContent,
    Section,
)
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class TextProcessor(IDocumentProcessor):
    """
    Processes plain text files.
    Simple processor with minimal transformation.
    """

    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.TXT

    @property
    def supported_extensions(self) -> list[str]:
        return [".txt", ".text"]

    async def parse(
        self,
        file_content: bytes,
        filename: str,
    ) -> ParsedContent:
        """
        Parse plain text file.
        Preserves content with minimal transformation.
        """
        try:
            # Decode bytes to string
            try:
                text_content = file_content.decode('utf-8')
            except UnicodeDecodeError:
                text_content = file_content.decode('latin-1')

            text_content = text_content.strip()

            if not text_content:
                raise ValueError("Empty text file")

            # Create section for entire text
            section = Section(
                title="Content",
                content=text_content,
                level=1,
                metadata={"type": "text", "lines": len(text_content.split('\n'))}
            )

            metadata = {
                "lines": len(text_content.split('\n')),
                "words": len(text_content.split()),
                "bytes": len(file_content),
            }

            return ParsedContent(
                text=text_content,
                sections=[section],
                tables=[],
                images=[],
                metadata=metadata,
            )

        except Exception as e:
            logger.error(f"Text parsing error for {filename}: {str(e)}")
            raise ValueError(f"Failed to parse text file: {str(e)}")

    def get_metadata(self, file_content: bytes) -> dict:
        """Extract text file metadata."""
        try:
            text_content = file_content.decode('utf-8', errors='ignore').strip()
            
            return {
                "is_valid": bool(text_content),
                "lines": len(text_content.split('\n')),
                "words": len(text_content.split()),
                "bytes": len(file_content),
            }

        except Exception as e:
            logger.error(f"Text metadata extraction error: {str(e)}")
            return {"is_valid": False, "error": str(e)}

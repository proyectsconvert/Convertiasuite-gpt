import logging

from app.domain.entities.document import (
    DocumentType,
    ParsedContent,
    Section,
)
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class MdProcessor(IDocumentProcessor):
    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.MD

    @property
    def supported_extensions(self) -> list[str]:
        return [".md", ".markdown"]

    async def parse(
        self,
        file_content: bytes,
        filename: str,
    ) -> ParsedContent:
        try:
            text_content = file_content.decode("utf-8", errors="ignore").strip()

            if not text_content:
                raise ValueError("Empty markdown file")

            section = Section(
                title="Markdown Content",
                content=text_content,
                level=1,
                metadata={"type": "markdown", "lines": len(text_content.split("\n"))},
            )

            metadata = {
                "lines": len(text_content.split("\n")),
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
            logger.error(f"Error parsing markdown file: {str(e)}")
            raise ValueError(f"Failed to parse markdown: {str(e)}")

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            text_content = file_content.decode("utf-8", errors="ignore").strip()

            return {
                "is_valid": bool(text_content),
                "lines": len(text_content.split("\n")),
                "words": len(text_content.split()),
                "bytes": len(file_content),
            }
        except Exception as e:
            logger.error(f"Markdown metadata extraction error: {str(e)}")
            return {"is_valid": False, "error": str(e)}

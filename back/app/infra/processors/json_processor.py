import logging

from app.domain.entities.document import (
    DocumentType,
    ParsedContent,
    Section,
)
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class JsonProcessor(IDocumentProcessor):
    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.JSON

    @property
    def supported_extensions(self) -> list[str]:
        return [".json"]

    async def parse(
        self,
        file_content: bytes,
        filename: str,
    ) -> ParsedContent:
        try:
            import json

            json_content = json.loads(file_content.decode("utf-8"))

            text_content = json.dumps(json_content, indent=2)

            section = Section(
                title="JSON Content",
                content=text_content,
                level=1,
                metadata={"type": "json"},
            )

            metadata = {
                "bytes": len(file_content),
                "keys": len(json_content) if isinstance(json_content, dict) else 0,
            }

            return ParsedContent(
                text=text_content,
                sections=[section],
                tables=[],
                images=[],
                metadata=metadata,
            )
        except Exception as e:
            raise ValueError(f"Failed to parse JSON file: {str(e)}")

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            import json

            json_content = json.loads(file_content.decode("utf-8"))

            return {
                "is_valid": True,
                "bytes": len(file_content),
                "keys": len(json_content) if isinstance(json_content, dict) else 0,
                "type": (
                    "dict"
                    if isinstance(json_content, dict)
                    else "array" if isinstance(json_content, list) else "other"
                ),
            }
        except Exception as e:
            logger.error(f"JSON metadata extraction error: {str(e)}")
            return {"is_valid": False, "error": str(e)}

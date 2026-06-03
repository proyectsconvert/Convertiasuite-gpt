import logging
from io import BytesIO
from pypdf import PdfReader
from app.domain.entities.document import DocumentType, ParsedContent, Section, Table
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class PdfProcessor(IDocumentProcessor):

    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.PDF

    @property
    def supported_extensions(self) -> list[str]:
        return ["pdf"]

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            reader = PdfReader(BytesIO(file_content))
            info = reader.metadata or {}
            return {
                "page_count": len(reader.pages),
                "author": info.get("/Author", ""),
                "title": info.get("/Title", ""),
                "creator": info.get("/Creator", ""),
            }
        except Exception as e:
            logger.warning(f"No se pudieron extraer metadatos del PDF: {e}")
            return {}

    async def parse(self, file_content: bytes, filename: str) -> ParsedContent:
        try:
            reader = PdfReader(BytesIO(file_content))
            pages_text: list[str] = []
            sections: list[Section] = []

            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    page_text = text.strip()
                    pages_text.append(f"--- Página {i + 1} ---\n{page_text}")
                    sections.append(
                        Section(
                            title=f"Página {i + 1}",
                            content=page_text,
                            level=1,
                            metadata={"page_number": i + 1},
                        )
                    )

            if not pages_text:
                full_text = (
                    "El PDF parece estar vacío o no se pudo extraer texto. "
                    "Verifique si contiene solo imágenes."
                )
            else:
                full_text = "\n\n".join(pages_text)

            return ParsedContent(
                text=full_text,
                sections=sections,
                tables=[],
                metadata=self.get_metadata(file_content),
            )

        except Exception as e:
            logger.error(f"Error parseando PDF '{filename}': {e}")
            raise ValueError(f"Error al procesar el archivo PDF: {e}")

    @staticmethod
    def extract_text(file_content: bytes) -> str:
        try:
            reader = PdfReader(BytesIO(file_content))
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages_text.append(f"--- Página {i + 1} ---\n{text.strip()}")

            if not pages_text:
                return (
                    "El PDF parece estar vacío o no se pudo extraer texto. "
                    "Verifique si contiene solo imágenes."
                )
            return "\n\n".join(pages_text)
        except Exception as e:
            logger.error(f"Error parseando PDF: {e}")
            raise ValueError(f"Error al procesar el archivo PDF: {e}")

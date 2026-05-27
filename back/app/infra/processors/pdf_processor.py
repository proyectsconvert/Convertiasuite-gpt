import logging
import io
from typing import Optional

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

from app.domain.entities.document import (
    DocumentType,
    ParsedContent,
    Section,
    Table,
    ImageMetadata,
)
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class PdfProcessor(IDocumentProcessor):
    def __init__(self):
        if pdfplumber is None:
            raise ImportError(
                "pdfplumber is required for PDF processing. Install with: pip install pdfplumber"
            )
        self.max_pages: Optional[int] = None  # None = all pages

    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.PDF

    @property
    def supported_extensions(self) -> list[str]:
        return [".pdf"]

    async def parse(
        self,
        file_content: bytes,
        filename: str,
    ) -> ParsedContent:

        try:
            pdf_file = io.BytesIO(file_content)

            with pdfplumber.open(pdf_file) as pdf:
                max_page = (
                    min(len(pdf.pages), self.max_pages)
                    if self.max_pages
                    else len(pdf.pages)
                )

                full_text = ""
                sections: list[Section] = []
                tables: list[Table] = []
                images: list[ImageMetadata] = []

                for page_num, page in enumerate(pdf.pages[:max_page], 1):
                    page_text = page.extract_text() or ""
                    if page_text:
                        full_text += f"\n--- Page {page_num} ---\n{page_text}"

                        section = Section(
                            title=f"Page {page_num}",
                            content=page_text,
                            level=1,
                            metadata={"page": page_num, "type": "page"},
                        )
                        sections.append(section)

                    page_tables = page.extract_tables()
                    if page_tables:
                        for table_idx, table_data in enumerate(page_tables):
                            if table_data and len(table_data) > 0:
                                headers = table_data[0] if len(table_data) > 0 else []
                                rows = table_data[1:] if len(table_data) > 1 else []

                                table = Table(
                                    headers=headers,
                                    rows=rows,
                                    name=f"Table_{page_num}_{table_idx}",
                                    metadata={"page": page_num, "index": table_idx},
                                )
                                tables.append(table)

                    page_images = page.images
                    if page_images:
                        for img_idx, img in enumerate(page_images):
                            image_meta = ImageMetadata(
                                name=f"Image_P{page_num}_{img_idx}",
                                page_number=page_num,
                                width=img.get("width"),
                                height=img.get("height"),
                                format="unknown",  # pdfplumber doesn't easily expose format
                            )
                            images.append(image_meta)

                metadata = {
                    "total_pages": len(pdf.pages),
                    "processed_pages": max_page,
                    "has_images": len(images) > 0,
                    "has_tables": len(tables) > 0,
                    "creator": pdf.metadata.get("Producer", "unknown"),
                }

                return ParsedContent(
                    text=full_text.strip(),
                    sections=sections,
                    tables=tables,
                    images=images,
                    metadata=metadata,
                )

        except Exception as e:
            logger.error(f"PDF parsing error for {filename}: {str(e)}")
            raise ValueError(f"Failed to parse PDF: {str(e)}")

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            pdf_file = io.BytesIO(file_content)

            with pdfplumber.open(pdf_file) as pdf:
                return {
                    "total_pages": len(pdf.pages),
                    "is_valid": True,
                    "creator": pdf.metadata.get("Producer", "unknown"),
                    "title": pdf.metadata.get("Title", ""),
                }
        except Exception as e:
            logger.error(f"PDF metadata extraction error: {str(e)}")
            return {"is_valid": False, "error": str(e)}

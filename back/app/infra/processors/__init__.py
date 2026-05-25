"""
Document processors package.
Concrete implementations of IDocumentProcessor for different file types.
"""

from app.infra.processors.csv_processor import CsvProcessor
from app.infra.processors.docx_processor import DocxProcessor
from app.infra.processors.excel_processor import ExcelProcessor
from app.infra.processors.pdf_processor import PdfProcessor
from app.infra.processors.text_processor import TextProcessor

__all__ = [
    "PdfProcessor",
    "DocxProcessor",
    "ExcelProcessor",
    "CsvProcessor",
    "TextProcessor",
]

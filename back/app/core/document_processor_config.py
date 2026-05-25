"""
Document processing factory initialization.
Registers all available processors.
"""

from app.domain.interfaces.document_processor import DocumentProcessorFactory
from app.infra.processors import (
    PdfProcessor,
    DocxProcessor,
    ExcelProcessor,
    CsvProcessor,
    TextProcessor,
)


def initialize_processor_factory() -> DocumentProcessorFactory:
    """
    Create and initialize the processor factory with all available processors.

    Returns:
        DocumentProcessorFactory ready for use
    """
    factory = DocumentProcessorFactory()

    # Register all processors
    try:
        factory.register(PdfProcessor())
        print("✓ PDF processor registered")
    except ImportError as e:
        print(f"⚠ PDF processor unavailable: {str(e)}")

    try:
        factory.register(DocxProcessor())
        print("✓ DOCX processor registered")
    except ImportError as e:
        print(f"⚠ DOCX processor unavailable: {str(e)}")

    try:
        factory.register(ExcelProcessor())
        print("✓ Excel processor registered")
    except ImportError as e:
        print(f"⚠ Excel processor unavailable: {str(e)}")

    try:
        factory.register(CsvProcessor())
        print("✓ CSV processor registered")
    except ImportError as e:
        print(f"⚠ CSV processor unavailable: {str(e)}")

    try:
        factory.register(TextProcessor())
        print("✓ Text processor registered")
    except ImportError as e:
        print(f"⚠ Text processor unavailable: {str(e)}")

    return factory

from app.domain.interfaces.document_processor import DocumentProcessorFactory
from app.infra.processors import (
    PdfProcessor,
    DocxProcessor,
    ExcelProcessor,
    CsvProcessor,
    TextProcessor,
    JsonProcessor,
    MdProcessor,
)


def initialize_processor_factory() -> DocumentProcessorFactory:

    factory = DocumentProcessorFactory()

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

    try:
        factory.register(JsonProcessor())
        print("✓ JSON processor registered")
    except ImportError as e:
        print(f"⚠ JSON processor unavailable: {str(e)}")

    try:
        factory.register(MdProcessor())
        print("✓ Markdown processor registered")
    except ImportError as e:
        print(f"⚠ Markdown processor unavailable: {str(e)}")

    return factory

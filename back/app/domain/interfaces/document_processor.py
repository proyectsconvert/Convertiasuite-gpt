from abc import ABC, abstractmethod
from typing import Optional

from app.domain.entities.document import DocumentType, ParsedContent


class IDocumentProcessor(ABC):

    @property
    @abstractmethod
    def supported_type(self) -> DocumentType:
        pass

    @property
    @abstractmethod
    def supported_extensions(self) -> list[str]:
        pass

    @abstractmethod
    async def parse(self, file_content: bytes, filename: str) -> ParsedContent:
        pass

    @abstractmethod
    def get_metadata(self, file_content: bytes) -> dict:
        pass


class DocumentProcessorFactory:

    def __init__(self):
        self._processors_by_type: dict[DocumentType, IDocumentProcessor] = {}
        self._processors_by_extension: dict[str, IDocumentProcessor] = {}

    def register(self, processor: IDocumentProcessor) -> None:
        self._processors_by_type[processor.supported_type] = processor

        for ext in processor.supported_extensions:
            normalized_ext = ext.lower().lstrip(".")
            self._processors_by_extension[normalized_ext] = processor

    def get_processor(
        self, document_type: DocumentType
    ) -> Optional[IDocumentProcessor]:
        return self._processors_by_type.get(document_type)

    def get_processor_by_extension(self, filename: str) -> Optional[IDocumentProcessor]:
        if not filename or "." not in filename:
            return None

        ext = filename.rsplit(".", 1)[1].lower()
        return self._processors_by_extension.get(ext)

    def is_supported(self, filename: str) -> bool:
        return self.get_processor_by_extension(filename) is not None

    @property
    def supported_types(self) -> list[DocumentType]:
        return list(self._processors_by_type.keys())

    @property
    def supported_extensions(self) -> list[str]:
        return list(self._processors_by_extension.keys())

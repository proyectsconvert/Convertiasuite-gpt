
from abc import ABC, abstractmethod
from app.domain.entities.document_content import DocumentContent

class IDocumentBuilder(ABC):
    
    @property
    @abstractmethod
    def output_format(self) -> str:
       pass

    @abstractmethod
    def build(self, content: DocumentContent) -> bytes:
       pass
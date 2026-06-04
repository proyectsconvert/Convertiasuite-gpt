import json
import logging
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder

logger = logging.getLogger(__name__)


class JsonBuilder(IDocumentBuilder):

    @property
    def output_format(self) -> str:
        return "json"

    def build(self, content: DocumentContent) -> bytes:
        try:
            try:
                data = content.model_dump()
            except AttributeError:
                data = content.dict()
            return json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
        except Exception as e:
            logger.error(f"Error generando JSON '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo JSON: {e}") from e

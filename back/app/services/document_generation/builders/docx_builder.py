import logging
from io import BytesIO
from app.core.files_config import BRAND_CONFIG
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine

logger = logging.getLogger(__name__)


class DocxBuilder(IDocumentBuilder):

    def __init__(self, engine: TemplateEngine):
        self._engine = engine

    @property
    def output_format(self) -> str:
        return "docx"

    def build(self, content: DocumentContent) -> bytes:
        try:
            from docxtpl import DocxTemplate
        except ImportError:
            logger.error("docxtpl no está instalado. Ejecute: pip install docxtpl")
            raise RuntimeError("docxtpl no está instalado.")

        brand = content.brand or "convertia"
        template_path = BRAND_CONFIG[brand]["templates"]["document"]

        try:
            doc = DocxTemplate(template_path)
            context = self._engine.build_docx_context(content, doc)
            doc.render(context)

            buffer = BytesIO()
            doc.save(buffer)
            logger.info(f"DOCX generado exitosamente: '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error generando DOCX '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo DOCX: {e}") from e

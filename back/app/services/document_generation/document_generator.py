from __future__ import annotations
import logging
from typing import Any, Dict, Union

from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine
from app.services.document_generation.markdown_parser import MarkdownToDocumentContentParser
from app.services.document_generation.builders import (
    DocxBuilder,
    PptxBuilder,
    ExcelBuilder,
    PdfBuilder,
    TxtBuilder,
    MdBuilder,
    JsonBuilder,
    CsvBuilder,
)

logger = logging.getLogger(__name__)

FORMAT_ALIASES: Dict[str, str] = {
    "word":       "docx",
    "powerpoint": "pptx",
    "ppt":        "pptx",
    "excel":      "xlsx",
    "xls":        "xlsx",
}


class DocumentGenerator:

    def __init__(self, brand: str = "convertia"):
        self._brand  = brand
        self._engine = TemplateEngine(brand=brand)
        self._builders: Dict[str, IDocumentBuilder] = {}
        self._register_defaults()

    def register(self, builder: IDocumentBuilder) -> None:
        self._builders[builder.output_format.lower()] = builder
        logger.debug(f"Builder registrado: {builder.output_format}")

    def _register_defaults(self) -> None:
        self.register(DocxBuilder(self._engine))
        self.register(PptxBuilder(self._engine))
        self.register(ExcelBuilder(self._engine))
        self.register(PdfBuilder(self._engine))
        self.register(TxtBuilder())
        self.register(MdBuilder())
        self.register(JsonBuilder())
        self.register(CsvBuilder())

    def generate(
        self,
        content: Union[DocumentContent, Dict[str, Any], str],
        fmt: str,
    ) -> bytes:
        normalized_fmt = FORMAT_ALIASES.get(fmt.lower(), fmt.lower())

        builder = self._builders.get(normalized_fmt)
        if not builder:
            supported = list(self._builders.keys()) + list(FORMAT_ALIASES.keys())
            raise ValueError(
                f"Formato '{fmt}' no soportado. "
                f"Formatos disponibles: {', '.join(sorted(set(supported)))}"
            )

        doc_content = self._normalize_input(content)

        logger.info(
            f"Generando '{normalized_fmt}' para '{doc_content.title}' "
            f"({len(doc_content.sections)} secciones, {len(doc_content.all_tables())} tablas)"
        )

        return builder.build(doc_content)

    def _normalize_input(
        self,
        content: Union[DocumentContent, Dict[str, Any], str],
    ) -> DocumentContent:
        if isinstance(content, DocumentContent):
            return content

        if isinstance(content, dict):
            try:
                return DocumentContent(**content)
            except Exception as e:
                logger.warning(
                    f"No se pudo construir DocumentContent desde dict: {e}. "
                    "Intentando extraer como Markdown."
                )
                text = content.get("content", str(content))
                return MarkdownToDocumentContentParser.parse(str(text))

        if isinstance(content, str):
            logger.debug("Input es Markdown legacy → convirtiendo a DocumentContent")
            return MarkdownToDocumentContentParser.parse(content)

        return DocumentContent(title="Documento", sections=[], tables=[])

    @property
    def supported_formats(self) -> list[str]:
        return sorted(set(list(self._builders.keys()) + list(FORMAT_ALIASES.keys())))

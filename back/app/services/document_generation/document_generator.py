from __future__ import annotations
import logging
from typing import Any, Dict, Union
import json
import io
import pandas as pd
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine
from app.services.document_generation.markdown_parser import MarkdownToDocumentContentParser
from app.services.document_generation.builders.docx_builder import DocxBuilder
from app.services.document_generation.builders.pptx_builder import PptxBuilder
from app.services.document_generation.builders.excel_builder import ExcelBuilder
from app.services.document_generation.builders.pdf_builder import PdfBuilder

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
            f"({len(doc_content.sections)} secciones, {len(doc_content.tables)} tablas)"
        )

        return builder.build(doc_content)

    def generate_txt(self, content: str) -> bytes:
        return content.encode("utf-8")

    def generate_md(self, content: str) -> bytes:
        return content.encode("utf-8")

    def generate_json(self, content: Any) -> bytes:
        import json
        try:
            if isinstance(content, str):
                parsed = json.loads(content)
                return json.dumps(parsed, indent=2, ensure_ascii=False).encode("utf-8")
            return json.dumps(content, indent=2, ensure_ascii=False).encode("utf-8")
        except Exception as e:
            logger.error(f"Error generando JSON: {e}")
            if isinstance(content, str):
                return content.encode("utf-8")
            return str(content).encode("utf-8")

    def generate_csv(self, content: Any) -> bytes:
        try:
            df = self._to_dataframe(content)
            output = io.BytesIO()
            df.to_csv(output, index=False, encoding="utf-8")
            return output.getvalue()
        except Exception as e:
            logger.error(f"Error generando CSV: {e}")
            if isinstance(content, str):
                return content.encode("utf-8")
            raise ValueError(f"Error al generar CSV: {e}")

 
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

    @staticmethod
    def _to_dataframe(content: Any):

        if isinstance(content, pd.DataFrame):
            return content
        if isinstance(content, str):
            try:
                parsed = json.loads(content)
                return pd.DataFrame(parsed if isinstance(parsed, list) else [parsed])
            except Exception:
                try:
                    return pd.read_csv(io.StringIO(content))
                except Exception:
                    return pd.DataFrame([{"Contenido": content}])
        if isinstance(content, list):
            return pd.DataFrame(content)
        return pd.DataFrame([{"Contenido": str(content)}])

    @property
    def supported_formats(self) -> list[str]:
        return sorted(set(list(self._builders.keys()) + list(FORMAT_ALIASES.keys())))

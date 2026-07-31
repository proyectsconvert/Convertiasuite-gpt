import io
import logging
import pandas as pd
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder

logger = logging.getLogger(__name__)


class CsvBuilder(IDocumentBuilder):

    @property
    def output_format(self) -> str:
        return "csv"

    def build(self, content: DocumentContent) -> bytes:
        try:
            tables = content.all_tables()
            if tables:
                table = tables[0]
                df = pd.DataFrame(table.rows, columns=table.headers)
            else:
                data = []
                for s in content.sections:
                    bullets_str = "; ".join(s.bullets) if s.bullets else ""
                    data.append({
                        "Título": s.title,
                        "Nivel": s.level,
                        "Contenido": s.content,
                        "Viñetas": bullets_str
                    })
                df = pd.DataFrame(data)

            output = io.BytesIO()
            df.to_csv(output, index=False, encoding="utf-8")
            return output.getvalue()
        except Exception as e:
            logger.error(f"Error generando CSV '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo CSV: {e}") from e

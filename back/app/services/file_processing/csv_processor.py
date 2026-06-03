import logging
from io import BytesIO
import pandas as pd
from app.domain.entities.document import DocumentType, ParsedContent, Section, Table
from app.domain.interfaces.document_processor import IDocumentProcessor
from app.services.file_processing.excel_processor import ExcelProcessor

logger = logging.getLogger(__name__)


class CsvProcessor(IDocumentProcessor):
    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.CSV

    @property
    def supported_extensions(self) -> list[str]:
        return ["csv"]

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            df = self._read_csv(file_content)
            return {
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns),
            }
        except Exception as e:
            logger.warning(f"No se pudieron extraer metadatos del CSV: {e}")
            return {}

    async def parse(self, file_content: bytes, filename: str) -> ParsedContent:
        try:
            text = self.extract_text(file_content)
            tables = self._extract_tables(file_content)
            return ParsedContent(
                text=text,
                sections=[Section(title="Datos CSV", content=text, level=1)],
                tables=tables,
                metadata=self.get_metadata(file_content),
            )
        except Exception as e:
            logger.error(f"Error parseando CSV '{filename}': {e}")
            raise ValueError(f"Error al procesar el archivo CSV: {e}")

    def _extract_tables(self, file_content: bytes) -> list[Table]:
        try:
            df = self._read_csv(file_content)
            headers = [str(c) for c in df.columns]
            rows = [[str(v) for v in row] for row in df.values.tolist()]
            return [Table(name="CSV", headers=headers, rows=rows)]
        except Exception:
            return []

    @classmethod
    def extract_text(cls, file_content: bytes) -> str:
        try:
            df = cls._read_csv(file_content)
            headers = list(df.columns)
            data_rows = df.values.tolist()
            rows = [headers] + data_rows
            return ExcelProcessor._analyze_tabular_data(rows)
        except Exception as e:
            logger.error(f"Error parseando CSV: {e}")
            raise ValueError(f"Error al procesar el archivo CSV: {e}")

    @staticmethod
    def _read_csv(file_content: bytes) -> pd.DataFrame:
        try:
            df = pd.read_csv(BytesIO(file_content), sep=None, engine="python", encoding="utf-8")
        except Exception:
            df = pd.read_csv(BytesIO(file_content), sep=None, engine="python", encoding="latin-1")
        return df.fillna("")

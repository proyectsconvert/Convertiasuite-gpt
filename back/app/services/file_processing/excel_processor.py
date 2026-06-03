import json
import logging
from io import BytesIO
import pandas as pd
from app.domain.entities.document import DocumentType, ParsedContent, Section, Table
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class ExcelProcessor(IDocumentProcessor):

    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.EXCEL

    @property
    def supported_extensions(self) -> list[str]:
        return ["xlsx", "xls"]

    def get_metadata(self, file_content: bytes) -> dict:
        try:
            xf = pd.ExcelFile(BytesIO(file_content))
            return {"sheet_names": xf.sheet_names, "sheet_count": len(xf.sheet_names)}
        except Exception as e:
            logger.warning(f"No se pudieron extraer metadatos del Excel: {e}")
            return {}

    async def parse(self, file_content: bytes, filename: str) -> ParsedContent:
        try:
            text = self.extract_text(file_content)
            tables = self._extract_tables(file_content)
            return ParsedContent(
                text=text,
                sections=[Section(title="Datos", content=text, level=1)],
                tables=tables,
                metadata=self.get_metadata(file_content),
            )
        except Exception as e:
            logger.error(f"Error parseando Excel '{filename}': {e}")
            raise ValueError(f"Error al procesar el archivo Excel: {e}")

    def _extract_tables(self, file_content: bytes) -> list[Table]:
        try:
            df = pd.read_excel(BytesIO(file_content)).fillna("")
            headers = [str(c) for c in df.columns]
            rows = [[str(v) for v in row] for row in df.values.tolist()]
            return [Table(name="Hoja principal", headers=headers, rows=rows)]
        except Exception:
            return []

    @classmethod
    def extract_text(cls, file_content: bytes) -> str:
        try:
            df = pd.read_excel(BytesIO(file_content)).fillna("")
            headers = list(df.columns)
            data_rows = df.values.tolist()
            rows = [headers] + data_rows
            return cls._analyze_tabular_data(rows)
        except Exception as e:
            logger.error(f"Error parseando Excel: {e}")
            raise ValueError(f"Error al procesar el archivo Excel: {e}")

    @classmethod
    def _analyze_tabular_data(cls, rows: list[list]) -> str:
        if not rows or len(rows) < 2:
            return "El archivo está vacío o no contiene filas válidas."

        try:
            df = pd.DataFrame(rows[1:], columns=rows[0])
            cols_norm = {str(col).strip().upper(): col for col in df.columns}

            resultado_mkt = cls._analizar_reporte_convertia(df, cols_norm)
            if resultado_mkt:
                return resultado_mkt

            resultado_fin = cls._analizar_reporte_financiero(df, cols_norm)
            if resultado_fin:
                return resultado_fin

            return cls._analizar_generico(df)

        except Exception as e:
            logger.warning(f"Error en pre-análisis optimizado, usando fallback: {e}")
            return cls._fallback_summary(rows)

    @staticmethod
    def _analizar_reporte_convertia(df: pd.DataFrame, cols_norm: dict) -> str | None:
        col_mkt = next(
            (cols_norm[c] for c in cols_norm if "CAMPAÑA_MKT" in c or "CAMPANA_MKT" in c),
            None,
        )
        col_llave = next(
            (cols_norm[c] for c in cols_norm if "ID_LLAVE" in c or "IDLLAVE" in c),
            None,
        )
        if not col_mkt or not col_llave:
            return None

        try:
            total_leads = len(df)

            def is_sale(val):
                if pd.isna(val):
                    return False
                return str(val).strip().lower() not in ["", "nan", "null", "none"]

            df["__ES_VENTA"] = df[col_llave].apply(is_sale)
            total_ventas = int(df["__ES_VENTA"].sum())

            leads_por_campana = df[col_mkt].value_counts().head(10).to_dict()
            ventas_por_campana = (
                df[df["__ES_VENTA"] == True][col_mkt].value_counts().head(10).to_dict()
            )

            conversion_por_campana = {}
            for campana in leads_por_campana:
                tot_l = len(df[df[col_mkt] == campana])
                tot_v = len(df[(df[col_mkt] == campana) & (df["__ES_VENTA"] == True)])
                rate = round((tot_v / tot_l) * 100, 2) if tot_l > 0 else 0
                conversion_por_campana[campana] = (
                    f"{rate}% ({tot_v} ventas de {tot_l} leads)"
                )

            payload = {
                "REPORTE_EJECUTIVO_BI_CONVERTIA": {
                    "metodologia_aplicada": (
                        "Filtrado estricto donde la columna ID_LLAVE "
                        "posee un identificador de venta válido."
                    ),
                    "resumen_global": {
                        "total_leads_recibidos": total_leads,
                        "total_ventas_exitosas": total_ventas,
                        "tasa_conversion_global": (
                            f"{round((total_ventas / total_leads) * 100, 2) if total_leads > 0 else 0}%"
                        ),
                    },
                    "top_campanas_por_volumen_leads": leads_por_campana,
                    "top_campanas_por_ventas_efectivas": ventas_por_campana,
                    "eficiencia_y_conversion_por_campana": conversion_por_campana,
                }
            }
            return (
                "--- PROCESAMIENTO AUTOMÁTICO DE DATOS COMERCIALES ---\n"
                "Usa este resumen estructurado con las métricas reales del archivo completo "
                "para responder las preguntas de BI:\n"
                f"{json.dumps(payload, indent=2, ensure_ascii=False)}"
            )
        except Exception as e:
            logger.error(f"Error en análisis BI Convertia: {e}")
            return None

    @staticmethod
    def _analizar_reporte_financiero(df: pd.DataFrame, cols_norm: dict) -> str | None:
        col_ingresos = next(
            (cols_norm[c] for c in cols_norm if "INGRESOS" in c or "REVENUE" in c),
            None,
        )
        if not col_ingresos:
            return None
        return "--- ANÁLISIS DE EXPERTO FINANCIERO (Pendiente implementar) ---"

    @staticmethod
    def _analizar_generico(df: pd.DataFrame) -> str:
        total_filas = len(df)
        columnas = [str(c).strip() for c in df.columns if c is not None]

        if total_filas <= 150:
            datos = df.to_dict(orient="records")
            payload = {
                "METADATA_DEL_ARCHIVO": {
                    "tipo_dataset": "Documento Estructurado General (Completo)",
                    "total_registros": total_filas,
                    "columnas_disponibles": columnas,
                },
                "CONTENIDO_REAL_FILA_POR_FILA": datos,
            }
            return (
                "--- ARCHIVO PROCESADO EXITOSAMENTE ---\n"
                "Analiza la siguiente base de datos completa para responder con precisión:\n"
                f"{json.dumps(payload, indent=2, ensure_ascii=False)}"
            )
        else:
            muestra = df.head(25).to_dict(orient="records")
            payload = {
                "METADATA_DEL_ARCHIVO": {
                    "tipo_dataset": "Dataset de Gran Volumen (Muestra Acotada)",
                    "total_registros": total_filas,
                    "columnas_disponibles": columnas,
                    "valores_unicos_por_columna": {
                        str(col): int(df[col].nunique()) for col in df.columns
                    },
                },
                "VISTA_PREVIA_REGISTROS_REALES": muestra,
            }
            return (
                "--- DATASET GRANDE PROCESADO ---\n"
                "Usa los metadatos y esta muestra representativa para responder al usuario:\n"
                f"{json.dumps(payload, indent=2, ensure_ascii=False)}"
            )

    @staticmethod
    def _fallback_summary(rows: list[list]) -> str:
        raw_headers = rows[0]
        headers = [
            str(h).strip() if h is not None and str(h).strip() != "" else f"Columna_{i + 1}"
            for i, h in enumerate(raw_headers)
        ]
        data_rows = rows[1:]
        total_rows = len(data_rows)
        num_cols = len(headers)

        summary = [
            "### Resumen General del Dataset (Fallback)",
            f"- **Total de filas de datos**: {total_rows}",
            f"- **Total de columnas**: {num_cols}",
            f"- **Nombres de columnas**: {', '.join([f'`{h}`' for h in headers])}",
            "",
            "### Vista Previa de Filas Completas",
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * num_cols) + " |",
        ]
        for r in data_rows[:10]:
            row_cells = [
                str(r[col_idx]).strip() if col_idx < len(r) and r[col_idx] is not None else ""
                for col_idx in range(num_cols)
            ]
            summary.append("| " + " | ".join(row_cells) + " |")

        return "\n".join(summary)

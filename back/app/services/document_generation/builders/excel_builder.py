import logging
from io import BytesIO
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from app.core.files_config import BRAND_CONFIG
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine

logger = logging.getLogger(__name__)


class ExcelBuilder(IDocumentBuilder):

    def __init__(self, engine: TemplateEngine):
        self._engine = engine

    @property
    def output_format(self) -> str:
        return "xlsx"

    def build(self, content: DocumentContent) -> bytes:
        brand = content.brand or "convertia"
        excel_cfg = BRAND_CONFIG[brand].get("excel", {})

        try:
            ctx = self._engine.build_excel_context(content)
            wb  = openpyxl.Workbook()
            wb.remove(wb.active)  # Eliminar hoja por defecto

            for sheet_ctx in ctx["sheets"]:
                ws = wb.create_sheet(title=sheet_ctx["name"][:31])
                self._write_sheet(ws, sheet_ctx, excel_cfg)

            buffer = BytesIO()
            wb.save(buffer)
            logger.info(f"XLSX generado exitosamente: '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error generando XLSX '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo Excel: {e}") from e

    def _write_sheet(
        self,
        ws: openpyxl.worksheet.worksheet.Worksheet,
        ctx: dict,
        cfg: dict,
    ) -> None:
        headers = ctx.get("headers", [])
        rows    = ctx.get("rows", [])
        summary = ctx.get("summary")

        header_fill   = PatternFill("solid", fgColor=cfg.get("header_fill", "011E23"))
        header_font   = Font(
            name=cfg.get("font_name", "Calibri"),
            bold=True,
            color=cfg.get("header_text", "FFFFFF"),
            size=10,
        )
        accent_fill   = PatternFill("solid", fgColor=cfg.get("accent_fill", "1aeda1"))
        zebra_fill    = PatternFill("solid", fgColor=cfg.get("zebra_fill", "F5F5F5"))
        border_color  = cfg.get("border_color", "D9D9D9")
        body_font     = Font(name=cfg.get("font_name", "Calibri"), size=9)
        center_align  = Alignment(horizontal="center", vertical="center")
        left_align    = Alignment(horizontal="left",   vertical="center")

        thin_border = Border(
            left=Side(style="thin", color=border_color),
            right=Side(style="thin", color=border_color),
            top=Side(style="thin", color=border_color),
            bottom=Side(style="thin", color=border_color),
        )

        for c_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c_idx, value=str(header))
            cell.fill      = header_fill
            cell.font      = header_font
            cell.alignment = center_align
            cell.border    = thin_border

        for r_idx, row in enumerate(rows, start=2):
            is_zebra = (r_idx % 2 == 0)
            for c_idx, value in enumerate(row, start=1):
                if c_idx > len(headers):
                    break
                cell = ws.cell(row=r_idx, column=c_idx, value=value)
                cell.font      = body_font
                cell.alignment = left_align
                cell.border    = thin_border
                if is_zebra:
                    cell.fill = zebra_fill

        for c_idx, header in enumerate(headers, start=1):
            col_letter = get_column_letter(c_idx)
            max_length = len(str(header))
            for row in rows:
                if c_idx - 1 < len(row):
                    max_length = max(max_length, len(str(row[c_idx - 1])))
            ws.column_dimensions[col_letter].width = min(max_length + 4, 50)

        if summary:
            summary_row = len(rows) + 2
            ws.cell(row=summary_row, column=1, value="RESUMEN").font = Font(
                bold=True, color="FFFFFF", name=cfg.get("font_name", "Calibri")
            )
            ws.cell(row=summary_row, column=1).fill = PatternFill(
                "solid", fgColor=cfg.get("header_fill", "011E23")
            )
            col = 2
            for key, val in summary.items():
                ws.cell(row=summary_row, column=col,     value=str(key)).font = body_font
                ws.cell(row=summary_row, column=col + 1, value=str(val)).font = body_font
                col += 2

        ws.freeze_panes = "A2"

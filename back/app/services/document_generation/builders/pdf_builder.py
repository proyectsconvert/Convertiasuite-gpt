import logging
from io import BytesIO

from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine

logger = logging.getLogger(__name__)


class PdfBuilder(IDocumentBuilder):

    def __init__(self, engine: TemplateEngine):
        self._engine = engine
        self._weasyprint_available = self._check_weasyprint()

    @property
    def output_format(self) -> str:
        return "pdf"

    def build(self, content: DocumentContent) -> bytes:
        if self._weasyprint_available:
            return self._build_with_weasyprint(content)
        else:
            logger.warning(
                "WeasyPrint no disponible, usando ReportLab como fallback."
            )
            return self._build_with_reportlab_fallback(content)

    def _build_with_weasyprint(self, content: DocumentContent) -> bytes:
        from weasyprint import HTML

        try:
            html_str = self._engine.build_html_context(content)
            pdf_bytes = HTML(string=html_str).write_pdf()
            logger.info(f"PDF generado con WeasyPrint: '{content.title}'")
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error generando PDF con WeasyPrint '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo PDF: {e}") from e

    def _build_with_reportlab_fallback(self, content: DocumentContent) -> bytes:
        try:
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table as PDFTable, TableStyle
            )
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            c_dark    = colors.HexColor("#011E23")
            c_green   = colors.HexColor("#10473F")
            c_accent  = colors.HexColor("#1AEB9F")
            c_body    = colors.HexColor("#2D3748")
            c_petrol  = colors.HexColor("#002422")
            c_light   = colors.HexColor("#F4F6F6")
            c_border  = colors.HexColor("#DBDFFC")

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer, pagesize=letter,
                rightMargin=54, leftMargin=54,
                topMargin=72, bottomMargin=64
            )
            styles = getSampleStyleSheet()

            title_s = ParagraphStyle("T1", parent=styles["Title"],
                fontSize=36, textColor=c_dark, spaceAfter=12)
            sub_s = ParagraphStyle("Sub", parent=styles["Normal"],
                fontSize=18, textColor=c_body, spaceAfter=10)
            h1_s = ParagraphStyle("H1", parent=styles["Heading1"],
                fontSize=18, textColor=c_green, spaceBefore=16, spaceAfter=8)
            h2_s = ParagraphStyle("H2", parent=styles["Heading2"],
                fontSize=14, textColor=c_body, spaceBefore=12, spaceAfter=6)
            h3_s = ParagraphStyle("H3", parent=styles["Heading3"],
                fontSize=12, textColor=c_body, spaceBefore=10, spaceAfter=4)
            body_s = ParagraphStyle("Body", parent=styles["BodyText"],
                fontSize=10, textColor=c_body, spaceAfter=6)
            bullet_s = ParagraphStyle("Bullet", parent=body_s,
                leftIndent=15, firstLineIndent=-10, spaceAfter=4)

            story = []

            # Portada
            story.append(Spacer(1, 100))
            story.append(Paragraph(content.title, title_s))
            accent_line = PDFTable([[""]], colWidths=[100], rowHeights=[3])
            accent_line.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), c_accent)]))
            story.append(accent_line)
            story.append(Spacer(1, 8))
            if content.subtitle:
                story.append(Paragraph(content.subtitle, sub_s))
            story.append(Spacer(1, 120))
            story.append(Paragraph(f"<b>Fecha:</b> {content.get_date()}", body_s))
            story.append(Paragraph(f"<b>Clasificación:</b> {content.classification}", body_s))
            story.append(PageBreak())

            # Secciones
            level_styles = {1: h1_s, 2: h2_s, 3: h3_s}
            for section in content.sections:
                story.append(Paragraph(
                    section.title,
                    level_styles.get(section.level, h2_s)
                ))
                if section.content:
                    for para in section.content.split("\n"):
                        if para.strip():
                            story.append(Paragraph(para, body_s))
                if section.bullets:
                    for bullet in section.bullets:
                        story.append(Paragraph(f"• {bullet}", bullet_s))
                if section.table:
                    story.append(self._build_pdf_table(
                        section.table, doc, body_s,
                        c_petrol, c_light, c_border
                    ))
                    story.append(Spacer(1, 10))

            # Tablas globales
            for table in content.tables:
                if table.caption:
                    story.append(Paragraph(table.caption, h2_s))
                story.append(self._build_pdf_table(
                    table, doc, body_s, c_petrol, c_light, c_border
                ))
                story.append(Spacer(1, 10))

            def draw_footer(canvas, document):
                canvas.saveState()
                canvas.setStrokeColor(c_accent)
                canvas.setLineWidth(0.5)
                canvas.line(54, 45, letter[0] - 54, 45)
                canvas.setFillColor(colors.HexColor("#494D52"))
                canvas.setFont("Helvetica", 8)
                canvas.drawString(
                    54, 30,
                    "© Intelligence Customer Acquisition — Convertia — Documentación interna"
                )
                canvas.drawRightString(letter[0] - 54, 30, f"Página {document.page}")
                canvas.restoreState()

            doc.build(story, onLaterPages=draw_footer)
            logger.info(f"PDF generado con ReportLab (fallback): '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error en fallback ReportLab '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo PDF: {e}") from e

    @staticmethod
    def _build_pdf_table(table, doc, body_s, c_petrol, c_light, c_border):
        from reportlab.platypus import Table as PDFTable, TableStyle, Paragraph
        from reportlab.lib import colors

        nc = len(table.headers)
        formatted = []
        header_row = []
        for h in table.headers:
            from reportlab.lib.styles import ParagraphStyle
            hs = ParagraphStyle("th", parent=body_s, fontSize=8,
                                textColor=colors.white, fontName="Helvetica-Bold")
            header_row.append(Paragraph(str(h), hs))
        formatted.append(header_row)

        for row in table.rows:
            data_row = []
            for cell in row:
                bs = ParagraphStyle("td", parent=body_s, fontSize=8,
                                    textColor=colors.HexColor("#1A202C"))
                data_row.append(Paragraph(str(cell), bs))
            formatted.append(data_row)

        col_width = doc.width / nc if nc else doc.width
        pdf_table = PDFTable(formatted, colWidths=[col_width] * nc)
        pdf_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  c_petrol),
            ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("GRID",          (0, 0), (-1, -1), 0.4, c_border),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light]),
        ]))
        return pdf_table

    @staticmethod
    def _check_weasyprint() -> bool:
        try:
            import weasyprint  
            return True
        except ImportError:
            return False

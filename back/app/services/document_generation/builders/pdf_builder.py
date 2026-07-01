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
            import os
            import re
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table as PDFTable, TableStyle, Image
            )
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            try:
                from PIL import Image as PILImage
                has_pil = True
            except ImportError:
                has_pil = False

            brand = content.brand or "convertia"
            from app.core.files_config import BRAND_CONFIG, BASE_DIR
            cfg = BRAND_CONFIG.get(brand, BRAND_CONFIG["convertia"])

            # Registrar fuentes corporativas si existen
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            font_reg = os.path.join(BASE_DIR, "assets", "fonts", "Inter-Regular.ttf")
            font_bld = os.path.join(BASE_DIR, "assets", "fonts", "Inter-Bold.ttf")
            base_font = "Helvetica"
            bold_font = "Helvetica-Bold"
            if os.path.exists(font_reg) and os.path.exists(font_bld):
                try:
                    pdfmetrics.registerFont(TTFont("Inter", font_reg))
                    pdfmetrics.registerFont(TTFont("Inter-Bold", font_bld))
                    pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="Inter-Bold")
                    base_font = "Inter"
                    bold_font = "Inter-Bold"
                except Exception as fe:
                    logger.warning(f"Error registering Inter font in ReportLab: {fe}")

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
                fontName=bold_font, fontSize=32, textColor=c_dark, spaceAfter=12, alignment=0)
            sub_s = ParagraphStyle("Sub", parent=styles["Normal"],
                fontName=base_font, fontSize=13, textColor=c_green, spaceAfter=10)
            h1_s = ParagraphStyle("H1", parent=styles["Heading1"],
                fontName=bold_font, fontSize=18, textColor=c_green, spaceBefore=16, spaceAfter=8)
            h2_s = ParagraphStyle("H2", parent=styles["Heading2"],
                fontName=bold_font, fontSize=14, textColor=c_body, spaceBefore=12, spaceAfter=6)
            h3_s = ParagraphStyle("H3", parent=styles["Heading3"],
                fontName=bold_font, fontSize=12, textColor=c_body, spaceBefore=10, spaceAfter=4)
            body_s = ParagraphStyle("Body", parent=styles["BodyText"],
                fontName=base_font, fontSize=10, textColor=c_body, spaceAfter=6)
            bullet_s = ParagraphStyle("Bullet", parent=body_s,
                fontName=base_font, leftIndent=15, firstLineIndent=-10, spaceAfter=4)

            story = []

            # Portada
            # Logotipo principal arriba a la derecha (convertia_main.png)
            logo_main_path = cfg["logos"].get("main")
            if logo_main_path and os.path.exists(logo_main_path):
                try:
                    if has_pil:
                        with PILImage.open(logo_main_path) as img_file:
                            w, h = img_file.size
                            aspect = w / h
                            logo_w = 25 * aspect
                            logo_h = 25
                    else:
                        logo_w = 100
                        logo_h = 25
                    img = Image(logo_main_path, width=logo_w, height=logo_h, hAlign="RIGHT")
                    story.append(img)
                except Exception as img_err:
                    logger.warning(f"Error loading main logo in ReportLab cover: {img_err}")

            story.append(Spacer(1, 40))

        

            # Título principal en dos tonos (última palabra en gris)
            words = content.title.split()
            if len(words) > 1:
                part1 = " ".join(words[:-1]) + " "
                part2 = words[-1]
            else:
                part1 = content.title
                part2 = ""

            title_text = f"{part1}"
            if part2:
                title_text += f'<font color="#718096">{part2}</font>'

            story.append(Paragraph(title_text, title_s))
            story.append(Spacer(1, 8))

            if content.subtitle:
                story.append(Paragraph(content.subtitle, sub_s))

            story.append(Spacer(1, 60))
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
                            p_text = para.strip()
                            if p_text.startswith(">"):
                                # Renderizar como bloque de cita/destacado
                                callout_text = p_text.lstrip(">").strip()
                                parts = re.split(r"(\*\*.*?\*\*)", callout_text)
                                formatted_parts = []
                                for part in parts:
                                    if part.startswith("**") and part.endswith("**"):
                                        formatted_parts.append(f'<font color="#1AEB9F"><b>{part[2:-2]}</b></font>')
                                    else:
                                        formatted_parts.append(part)
                                formatted_text = "".join(formatted_parts)

                                callout_style = ParagraphStyle("CalloutText", parent=styles["Normal"],
                                    fontName=bold_font, fontSize=10.5, textColor=colors.white,
                                    alignment=1, spaceAfter=0)

                                callout_p = Paragraph(formatted_text, callout_style)
                                callout_table = PDFTable([[callout_p]], colWidths=[doc.width])
                                callout_table.setStyle(TableStyle([
                                    ("BACKGROUND", (0, 0), (-1, -1), c_dark),
                                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                    ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
                                    ("TOPPADDING", (0, 0), (-1, -1), 16),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 20),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 20),
                                ]))
                                story.append(callout_table)
                                story.append(Spacer(1, 10))
                            else:
                                story.append(Paragraph(p_text, body_s))
                if section.bullets:
                    for bullet in section.bullets:
                        story.append(Paragraph(f"• {bullet}", bullet_s))
                if section.table:
                    story.append(self._build_pdf_table(
                        section.table, doc, body_s,
                        c_petrol, c_light, c_border, bold_font
                    ))
                    story.append(Spacer(1, 10))

            # Tablas globales
            for table in content.tables:
                if table.caption:
                    story.append(Paragraph(table.caption, h2_s))
                story.append(self._build_pdf_table(
                    table, doc, body_s, c_petrol, c_light, c_border, bold_font
                ))
                story.append(Spacer(1, 10))

            def draw_page_decorations(canvas, document):
                canvas.saveState()

                # Draw Header (docs logo on the top right)
                logo_docs_path = cfg["logos"].get("docs")
                if logo_docs_path and os.path.exists(logo_docs_path):
                    try:
                        if has_pil:
                            with PILImage.open(logo_docs_path) as img_file:
                                w, h = img_file.size
                                aspect = w / h
                                logo_w = 25 * aspect
                                logo_h = 25
                        else:
                            logo_w = 25
                            logo_h = 25
                        canvas.drawImage(logo_docs_path, letter[0] - 54 - logo_w, letter[1] - 54, width=logo_w, height=logo_h, mask='auto')
                    except Exception as header_img_err:
                        logger.warning(f"Error drawing header logo in ReportLab: {header_img_err}")

                # Draw Footer (Copyright on left, Page number on right)
                canvas.setFillColor(colors.HexColor("#718096"))
                canvas.setFont(base_font, 8)
                canvas.drawString(
                    54, 30,
                    "© Intelligence Customer Acquisition — Convertia — Documentación interna"
                )
                canvas.drawRightString(letter[0] - 54, 30, f"{document.page}")
                canvas.restoreState()

            doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=draw_page_decorations)
            logger.info(f"PDF generado con ReportLab (fallback): '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error en fallback ReportLab '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo PDF: {e}") from e

    @staticmethod
    def _build_pdf_table(table, doc, body_s, c_petrol, c_light, c_border, bold_font):
        from reportlab.platypus import Table as PDFTable, TableStyle, Paragraph
        from reportlab.lib import colors
        from reportlab.lib.styles import ParagraphStyle

        nc = len(table.headers)
        formatted = []
        header_row = []
        for h in table.headers:
            hs = ParagraphStyle("th", parent=body_s, fontSize=9.5,
                                textColor=colors.white, fontName=bold_font)
            header_row.append(Paragraph(str(h), hs))
        formatted.append(header_row)

        table_styles = [
            ("BACKGROUND",    (0, 0), (-1, 0),  c_petrol),
            ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("GRID",          (0, 0), (-1, -1), 0.4, c_border),
        ]

        for r_idx, row in enumerate(table.rows):
            is_highlight = any(str(val).strip().lower() == "destacado" for val in row)
            data_row = []
            
            if is_highlight:
                row_bg = colors.HexColor("#E6FFFA")
                td_style = ParagraphStyle(f"td_h_{r_idx}", parent=body_s, fontSize=9.5,
                                          textColor=colors.HexColor("#10473F"), fontName=bold_font)
            else:
                row_bg = colors.white if r_idx % 2 == 0 else c_light
                td_style = ParagraphStyle(f"td_n_{r_idx}", parent=body_s, fontSize=9.5,
                                          textColor=colors.HexColor("#2D3748"))
            
            for cell in row:
                data_row.append(Paragraph(str(cell), td_style))
            formatted.append(data_row)
            
            table_styles.append(("BACKGROUND", (0, r_idx + 1), (-1, r_idx + 1), row_bg))

        col_width = doc.width / nc if nc else doc.width
        pdf_table = PDFTable(formatted, colWidths=[col_width] * nc)
        pdf_table.setStyle(TableStyle(table_styles))
        return pdf_table

    @staticmethod
    def _check_weasyprint() -> bool:
        try:
            import weasyprint  
            return True
        except (ImportError, OSError) as e:
            logger.warning(
                f"WeasyPrint no disponible (faltan dependencias binarias de GTK/GObject): {e}. "
                "Se usará ReportLab como fallback."
            )
            return False
        except Exception as e:
            logger.warning(f"WeasyPrint no disponible por error inesperado: {e}")
            return False

import logging
from io import BytesIO
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx import Presentation
from pptx.util import Pt as PPTXPt
from app.core.files_config import BRAND_CONFIG
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.document_generation.template_engine import TemplateEngine
from pptx.oxml.ns import qn
logger = logging.getLogger(__name__)

# Índices de layouts en el Slide Master de la plantilla corporativa
LAYOUT_COVER   = 0
LAYOUT_SECTION = 1
LAYOUT_CONTENT = 2
LAYOUT_TABLE   = 3
LAYOUT_CLOSING = 4
LAYOUT_BLANK   = 5


class PptxBuilder(IDocumentBuilder):
    def __init__(self, engine: TemplateEngine):
        self._engine = engine

    @property
    def output_format(self) -> str:
        return "pptx"

    def build(self, content: DocumentContent) -> bytes:
        brand = content.brand or "convertia"
        template_path = BRAND_CONFIG[brand]["templates"]["presentation"]

        try:
            prs = Presentation(template_path)
            ctx = self._engine.build_pptx_context(content)

            # Eliminar slides de ejemplo
            self._clear_slides(prs)

            for slide_data in ctx["slides"]:
                slide_type = slide_data.get("type")

                if slide_type == "cover":
                    self._add_cover_slide(prs, slide_data)
                elif slide_type == "section":
                    self._add_section_slide(prs, slide_data)
                elif slide_type == "content":
                    self._add_content_slide(prs, slide_data)
                elif slide_type == "table":
                    self._add_table_slide(prs, slide_data)
                elif slide_type == "closing":
                    self._add_closing_slide(prs)

            buffer = BytesIO()
            prs.save(buffer)
            logger.info(f"PPTX generado exitosamente: '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error generando PPTX '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo PPTX: {e}") 

    def _get_layout(self, prs: Presentation, index: int):
        layouts = prs.slide_layouts
        if index < len(layouts):
            return layouts[index]
        return layouts[-1]

    def _clear_slides(self, prs: Presentation) -> None:
        xml_slides = prs.slides._sldIdLst
        for slide in list(prs.slides):
            rId = prs.slides._sldIdLst.find(
                f".//{qn('p:sldId')}[@r:id='{slide._element.get('r:id')}']"
            )
        # Forma robusta: limpiar desde el XML
        slide_xml_list = prs.slides._sldIdLst
        for sldId in list(slide_xml_list):
            slide_xml_list.remove(sldId)

    def _safe_set_text(self, placeholder, text: str) -> None:
        try:
            if placeholder is not None:
                placeholder.text = str(text)
        except Exception as e:
            logger.debug(f"No se pudo asignar texto al placeholder: {e}")

    def _set_body_text(self, placeholder, content: str, bullets: list) -> None:
        try:
            tf = placeholder.text_frame
            tf.clear()
            if content:
                para = tf.paragraphs[0]
                para.text = content
            if bullets:
                for bullet in bullets:
                    p = tf.add_paragraph()
                    p.text = f"• {bullet}"
                    p.level = 1
        except Exception as e:
            logger.debug(f"No se pudo asignar body text: {e}")

    def _add_cover_slide(self, prs: Presentation, data: dict) -> None:
        layout = self._get_layout(prs, LAYOUT_COVER)
        slide  = prs.slides.add_slide(layout)
        ph     = slide.placeholders

        self._safe_set_text(ph.get(0), data.get("title", ""))
        self._safe_set_text(ph.get(1), data.get("subtitle", ""))

        if 2 in ph:
            self._safe_set_text(
                ph[2],
                f"{data.get('date', '')}  ·  {data.get('classification', '')}"
            )

    def _add_section_slide(self, prs: Presentation, data: dict) -> None:
        layout = self._get_layout(prs, LAYOUT_SECTION)
        slide  = prs.slides.add_slide(layout)
        ph     = slide.placeholders

        self._safe_set_text(ph.get(0), f"{data.get('number', 1):02d}")
        self._safe_set_text(ph.get(1), data.get("title", ""))
        if 2 in ph:
            self._safe_set_text(ph[2], data.get("subtitle", ""))

    def _add_content_slide(self, prs: Presentation, data: dict) -> None:
        layout = self._get_layout(prs, LAYOUT_CONTENT)
        slide  = prs.slides.add_slide(layout)
        ph     = slide.placeholders

        self._safe_set_text(ph.get(0), data.get("title", ""))

        if 1 in ph:
            self._set_body_text(
                ph[1],
                data.get("content", ""),
                data.get("bullets", [])
            )

        for sub in data.get("subheadings", []):
            if 1 in ph:
                try:
                    tf = ph[1].text_frame
                    p = tf.add_paragraph()
                    p.text = sub["title"]
                    run = p.runs[0] if p.runs else p.add_run()
                    run.font.bold = True
                    run.font.size = PPTXPt(13)
                    for b in sub.get("bullets", []):
                        bp = tf.add_paragraph()
                        bp.text = f"• {b}"
                        bp.level = 1
                except Exception:
                    pass

    def _add_table_slide(self, prs: Presentation, data: dict) -> None:
        layout = self._get_layout(prs, LAYOUT_TABLE)
        slide  = prs.slides.add_slide(layout)
        ph     = slide.placeholders

        self._safe_set_text(ph.get(0), data.get("title", "Datos"))

        table_data = data.get("table", {})
        if table_data and table_data.get("rows"):
            self._insert_table(slide, table_data)

    def _add_closing_slide(self, prs: Presentation) -> None:
        layout = self._get_layout(prs, LAYOUT_CLOSING)
        prs.slides.add_slide(layout)

    def _insert_table(self, slide, table_data: dict) -> None:

        headers = table_data.get("headers", [])
        rows    = table_data.get("rows", [])

        if not headers:
            return

        n_cols = len(headers)
        n_rows = len(rows) + 1 

        left   = Inches(0.5)
        top    = Inches(1.6)
        width  = Inches(12.4)
        height = Inches(min(0.38 * n_rows, 5.5))

        tshape = slide.shapes.add_table(n_rows, n_cols, left, top, width, height)
        tbl    = tshape.table

        # Fila de encabezado
        for c_idx, header in enumerate(headers):
            cell = tbl.cell(0, c_idx)
            cell.text = str(header)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(1, 30, 35)   # #011E23
            for para in cell.text_frame.paragraphs:
                for run in para.runs:
                    run.font.color.rgb = RGBColor(255, 255, 255)
                    run.font.bold      = True
                    run.font.size      = Pt(10)

        # Filas de datos
        for r_idx, row in enumerate(rows):
            for c_idx, cell_val in enumerate(row):
                if c_idx >= n_cols:
                    continue
                cell = tbl.cell(r_idx + 1, c_idx)
                cell.text = str(cell_val)
                if r_idx % 2 == 0:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = RGBColor(244, 246, 246)  # #F4F6F6

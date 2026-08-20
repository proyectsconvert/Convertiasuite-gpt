import os
import logging
import re
from io import BytesIO

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from app.core.files_config import BRAND_CONFIG
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder
from app.services.documents.document_generation.template_engine import TemplateEngine

logger = logging.getLogger(__name__)


def set_cell_background(cell, fill_hex):
    """Establece el color de fondo de una celda de tabla."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def clear_table_borders(table):
    """Elimina todos los bordes de una tabla."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="none"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="none"/>'
        f'  <w:insideV w:val="none"/>'
        f"</w:tblBorders>"
    )
    tblPr.append(borders)


def set_table_borders(table, color_hex="DBDFFC", sz="4"):
    """Aplica bordes finos a una tabla."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f"</w:tblBorders>"
    )
    tblPr.append(borders)


def set_table_margins(table, top=100, bottom=100, left=150, right=150):
    tblPr = table._tbl.tblPr
    cellMar = parse_xml(
        f'<w:tblCellMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f"</w:tblCellMar>"
    )
    tblPr.append(cellMar)


def add_xml_field_to_run(run, field_name):
    """Inserta un campo dinámico de Word (p. ej. PAGE, NUMPAGES) en un run."""
    fldChar1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
    instrText = parse_xml(
        f'<w:instrText {nsdecls("w")} xml:space="preserve"> {field_name} </w:instrText>'
    )
    fldChar2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="separate"/>')
    fldChar3 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
    r = run._r
    r.append(fldChar1)
    r.append(instrText)
    r.append(fldChar2)
    r.append(fldChar3)


def format_run(
    run, font_name="Arial", size_pt=10.5, color_rgb=None, bold=False, italic=False
):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb


def format_paragraph(
    paragraph,
    space_before_pt=0,
    space_after_pt=6,
    line_spacing=1.15,
    keep_with_next=False,
):
    p_format = paragraph.paragraph_format
    p_format.space_before = Pt(space_before_pt)
    p_format.space_after = Pt(space_after_pt)
    p_format.line_spacing = line_spacing
    p_format.keep_with_next = keep_with_next


def number_sections(sections):
    h1_count = 0
    h2_count = 0
    h3_count = 0
    numbered_list = []

    for s in sections:
        if s.level == 1:
            h1_count += 1
            h2_count = 0
            h3_count = 0
            num_str = f"{h1_count}. "
        elif s.level == 2:
            h2_count += 1
            h3_count = 0
            num_str = f"{h1_count}.{h2_count}. "
        else:
            h3_count += 1
            num_str = f"{h1_count}.{h2_count}.{h3_count}. "

        title = s.title.strip()
        if not re.match(r"^\d+(\.\d+)*\.", title):
            numbered_title = num_str + title
        else:
            numbered_title = title
        numbered_list.append((s, numbered_title, num_str))

    return numbered_list


def add_grey_badge(doc, text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False

    table.columns[0].width = Inches(1.4)
    cell = table.cell(0, 0)
    cell.width = Inches(1.4)

    set_cell_background(cell, "F5F5F5")
    clear_table_borders(table)
    set_table_margins(table, top=40, bottom=40, left=100, right=100)

    p = cell.paragraphs[0]
    format_paragraph(p, space_before_pt=0, space_after_pt=0)
    run = p.add_run(text)
    format_run(
        run, font_name="Arial", size_pt=8, color_rgb=RGBColor(113, 128, 150), bold=True
    )


class DocxBuilder(IDocumentBuilder):

    def __init__(self, engine: TemplateEngine):
        self._engine = engine

    @property
    def output_format(self) -> str:
        return "docx"

    def _clear_body(self, doc: docx.Document) -> None:
        """Remove all paragraphs and tables from body, preserving styles/headers/footers."""
        body = doc.element.body
        to_remove = []
        for child in body:
            tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if tag in ("p", "tbl"):
                to_remove.append(child)
        for el in to_remove:
            body.remove(el)

    def build(self, content: DocumentContent) -> bytes:
        brand = content.brand or "convertia"
        cfg = BRAND_CONFIG.get(brand, BRAND_CONFIG["convertia"])
        brand_fonts = cfg.get("fonts", {})
        self._title_font = brand_fonts.get("title", "Arial")
        self._body_font = brand_fonts.get("body", "Arial")

        try:
            # ── 1. Cargar plantilla física (conservando estilos, encabezado y pie) ──
            template_path = cfg["templates"].get("word")
            if template_path and os.path.exists(template_path):
                doc = docx.Document(template_path)
                self._clear_body(doc)
                logger.info(f"Plantilla Word cargada y limpiada: {template_path}")
            else:
                doc = docx.Document()
                logger.warning("No se encontró plantilla Word física, usando documento en blanco.")

            # ── 2. Portada dinámica ────────────────────────────────────────
            p_title = doc.add_paragraph()
            format_paragraph(p_title, space_before_pt=72, space_after_pt=12)

            words = content.title.split()
            if len(words) > 1:
                part1 = " ".join(words[:-1]) + " "
                part2 = words[-1]
            else:
                part1 = content.title
                part2 = ""

            r1 = p_title.add_run(part1)
            format_run(r1, font_name=self._title_font, size_pt=32,
                       color_rgb=RGBColor(1, 30, 35), bold=True)
            if part2:
                r2 = p_title.add_run(part2)
                format_run(r2, font_name=self._title_font, size_pt=32,
                           color_rgb=RGBColor(26, 235, 159), bold=True)

            if content.subtitle:
                p_sub = doc.add_paragraph()
                format_paragraph(p_sub, space_before_pt=4, space_after_pt=8)
                r_sub = p_sub.add_run(content.subtitle)
                format_run(r_sub, font_name=self._title_font, size_pt=14,
                           color_rgb=RGBColor(16, 71, 63))

            # Línea separadora accent (tabla 1×1)
            sep = doc.add_table(rows=1, cols=1)
            sep.alignment = WD_TABLE_ALIGNMENT.LEFT
            sep.autofit = False
            sep.columns[0].width = Inches(6.5)
            sep_cell = sep.cell(0, 0)
            sep_cell.width = Inches(6.5)
            set_cell_background(sep_cell, "1AEB9F")
            clear_table_borders(sep)
            set_table_margins(sep, top=0, bottom=0, left=0, right=0)
            format_paragraph(sep_cell.paragraphs[0], space_before_pt=1, space_after_pt=1)
            sep_cell.paragraphs[0].add_run(" ")

            # Metadatos de portada
            p_meta = doc.add_paragraph()
            format_paragraph(p_meta, space_before_pt=14, space_after_pt=0)
            r_meta = p_meta.add_run(
                f"Fecha de generación: {content.get_date()}"
                f"\nGenerado por: Convertia AI"
                f"\nClasificación: {content.classification}"
            )
            format_run(r_meta, font_name=self._body_font, size_pt=10,
                       color_rgb=RGBColor(113, 128, 150))

            doc.add_page_break()

            # ── 3. Índice de contenidos ───────────────────────────────────
            numbered_sections = number_sections(content.sections)

            p_idx_title = doc.add_paragraph()
            format_paragraph(p_idx_title, space_before_pt=0, space_after_pt=18)
            format_run(
                p_idx_title.add_run("ÍNDICE DE CONTENIDOS"),
                font_name=self._title_font, size_pt=18,
                color_rgb=RGBColor(1, 30, 35), bold=True,
            )

            for s_item, num_title, _ in numbered_sections:
                p_item = doc.add_paragraph()
                format_paragraph(p_item, space_before_pt=4, space_after_pt=4)
                if s_item.level == 2:
                    p_item.paragraph_format.left_indent = Inches(0.3)
                elif s_item.level == 3:
                    p_item.paragraph_format.left_indent = Inches(0.6)
                bullet_char = "—" if s_item.level == 1 else "·"
                format_run(
                    p_item.add_run(f"{bullet_char}  {num_title}"),
                    font_name=self._body_font, size_pt=10,
                    color_rgb=RGBColor(45, 55, 72), bold=(s_item.level == 1),
                )

            doc.add_page_break()

            # ── 4. Cuerpo del documento ───────────────────────────────────
            for s_idx, (section_item, numbered_title, _) in enumerate(numbered_sections):
                level = section_item.level

                if level == 1:
                    if s_idx > 0:
                        doc.add_page_break()
                    self._add_section_divider(doc, numbered_title)

                elif level == 2:
                    p = doc.add_paragraph()
                    format_paragraph(p, space_before_pt=20, space_after_pt=8, keep_with_next=True)
                    self._add_left_border(p, color_hex="1AEB9F")
                    p.paragraph_format.left_indent = Inches(0.2)
                    format_run(p.add_run(numbered_title), font_name=self._title_font,
                               size_pt=13, color_rgb=RGBColor(16, 71, 63), bold=True)

                else:
                    p = doc.add_paragraph()
                    format_paragraph(p, space_before_pt=14, space_after_pt=6, keep_with_next=True)
                    format_run(p.add_run(numbered_title), font_name=self._title_font,
                               size_pt=11, color_rgb=RGBColor(45, 55, 72), bold=True)

                # Párrafos de texto
                if section_item.content:
                    for para in section_item.content.split("\n"):
                        para = para.strip()
                        if not para:
                            continue
                        if para.startswith(">"):
                            self._add_docx_callout_box(doc, para.lstrip(">").strip())
                        else:
                            p_text = doc.add_paragraph()
                            format_paragraph(p_text, space_before_pt=0, space_after_pt=6)
                            p_text.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                            format_run(p_text.add_run(para), font_name=self._body_font,
                                       size_pt=10.5, color_rgb=RGBColor(45, 55, 72))

                # Viñetas
                if section_item.bullets:
                    for bullet in section_item.bullets:
                        bullet = bullet.strip()
                        if not bullet:
                            continue
                        p_bullet = doc.add_paragraph()
                        format_paragraph(p_bullet, space_before_pt=0, space_after_pt=4)
                        p_bullet.paragraph_format.left_indent = Inches(0.2)
                        format_run(p_bullet.add_run(f"• {bullet}"), font_name=self._body_font,
                                   size_pt=10.5, color_rgb=RGBColor(45, 55, 72))

                # Tabla inline de la sección
                if section_item.table:
                    self._add_docx_table(doc, section_item.table)

            # ── 5. Tablas globales ────────────────────────────────────────
            if content.tables:
                doc.add_page_break()
                p_gt = doc.add_paragraph()
                format_paragraph(p_gt, space_before_pt=0, space_after_pt=18)
                format_run(p_gt.add_run("TABLAS Y DATOS ADICIONALES"),
                           font_name=self._title_font, size_pt=18,
                           color_rgb=RGBColor(1, 30, 35), bold=True)
                for table in content.tables:
                    self._add_docx_table(doc, table)

            # ── 6. Guardar y retornar ─────────────────────────────────────
            buffer = BytesIO()
            doc.save(buffer)
            logger.info(f"DOCX generado exitosamente: '{content.title}'")
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error generando DOCX '{content.title}': {e}", exc_info=True)
            raise RuntimeError(f"Error al generar el archivo DOCX: {e}") from e

    def _add_section_divider(self, doc: docx.Document, title: str) -> None:
        """Adds a dark background block as a section header (level 1)."""
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.LEFT
        table.autofit = False
        table.columns[0].width = Inches(6.5)
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, "011E23")
        clear_table_borders(table)
        set_table_margins(table, top=160, bottom=160, left=200, right=200)

        p = cell.paragraphs[0]
        format_paragraph(p, space_before_pt=0, space_after_pt=0)
        r = p.add_run(title)
        format_run(r, font_name=self._title_font, size_pt=16,
                   color_rgb=RGBColor(255, 255, 255), bold=True)

        # Accent bar below
        bar = doc.add_table(rows=1, cols=1)
        bar.alignment = WD_TABLE_ALIGNMENT.LEFT
        bar.autofit = False
        bar.columns[0].width = Inches(1.5)
        bar_cell = bar.cell(0, 0)
        bar_cell.width = Inches(1.5)
        set_cell_background(bar_cell, "1AEB9F")
        clear_table_borders(bar)
        set_table_margins(bar, top=0, bottom=0, left=0, right=0)
        p_bar = bar_cell.paragraphs[0]
        p_bar.add_run(" ")
        format_paragraph(p_bar, space_before_pt=2, space_after_pt=14)

    def _add_left_border(self, paragraph, color_hex: str = "1AEB9F") -> None:
        """Adds a colored left border to a paragraph via XML."""
        pPr = paragraph._p.get_or_add_pPr()
        pBdr = parse_xml(
            f'<w:pBdr {nsdecls("w")}>'
            f'  <w:left w:val="single" w:sz="18" w:space="4" w:color="{color_hex}"/>'
            f'</w:pBdr>'
        )
        pPr.append(pBdr)

    def _add_docx_callout_box(self, doc, text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        table.columns[0].width = Inches(6.5)

        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, "011E23")
        clear_table_borders(table)
        set_table_margins(table, top=160, bottom=160, left=200, right=200)

        p = cell.paragraphs[0]
        format_paragraph(p, space_before_pt=4, space_after_pt=4)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        parts = re.split(r"(\*\*.*?\*\*)", text)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                run = p.add_run(part[2:-2])
                format_run(
                    run,
                    font_name=self._body_font,
                    size_pt=10.5,
                    color_rgb=RGBColor(26, 235, 159),
                    bold=True,
                )
            else:
                run = p.add_run(part)
                format_run(
                    run,
                    font_name=self._body_font,
                    size_pt=10.5,
                    color_rgb=RGBColor(255, 255, 255),
                    bold=True,
                )

        # Espacio tras la caja
        p_space = doc.add_paragraph()
        format_paragraph(p_space, space_before_pt=0, space_after_pt=10)

    def _add_docx_table(self, doc, table_data):
        headers = table_data.headers
        rows = table_data.rows
        caption = table_data.caption

        if not headers:
            return

        if caption:
            p_cap = doc.add_paragraph()
            format_paragraph(
                p_cap, space_before_pt=12, space_after_pt=4, keep_with_next=True
            )
            r_cap = p_cap.add_run(caption.upper())
            format_run(
                r_cap,
                font_name=self._title_font,
                size_pt=9,
                color_rgb=RGBColor(113, 128, 150),
                bold=True,
            )

        num_rows = len(rows) + 1
        num_cols = len(headers)

        table = doc.add_table(rows=num_rows, cols=num_cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        set_table_borders(table, color_hex="DBDFFC", sz="4")
        set_table_margins(table, top=100, bottom=100, left=150, right=150)

        col_width = Inches(6.5 / num_cols)
        for col in table.columns:
            col.width = col_width

        # Escribir Cabecera (#011E23)
        hdr_cells = table.rows[0].cells
        for c_idx, header in enumerate(headers):
            cell = hdr_cells[c_idx]
            cell.width = col_width
            set_cell_background(cell, "011E23")
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            p = cell.paragraphs[0]
            format_paragraph(p, space_before_pt=2, space_after_pt=2)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(header))
            format_run(
                r,
                font_name=self._body_font,
                size_pt=9.5,
                color_rgb=RGBColor(255, 255, 255),
                bold=True,
            )

        # Escribir Datos (Cebra o Destacado)
        for r_idx, row in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells

            # Detectar fila destacada (si contiene la palabra "Destacado" en cualquier celda)
            is_highlight = any(str(val).strip().lower() == "destacado" for val in row)

            if is_highlight:
                bg_hex = "E6FFFA"  # Fondo cian claro
                text_color = RGBColor(16, 71, 63)  # Texto verde bosque oscuro
                is_bold = True
            else:
                bg_hex = "FFFFFF" if r_idx % 2 == 0 else "F5F5F5"
                text_color = RGBColor(45, 55, 72)
                is_bold = False

            for c_idx, val in enumerate(row):
                if c_idx >= num_cols:
                    break
                cell = row_cells[c_idx]
                cell.width = col_width
                set_cell_background(cell, bg_hex)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

                p = cell.paragraphs[0]
                format_paragraph(p, space_before_pt=2, space_after_pt=2)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(str(val))
                format_run(
                    r,
                    font_name=self._body_font,
                    size_pt=9.5,
                    color_rgb=text_color,
                    bold=is_bold,
                )

        p_space = doc.add_paragraph()
        format_paragraph(p_space, space_before_pt=0, space_after_pt=10)

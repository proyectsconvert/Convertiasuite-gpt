from __future__ import annotations
import os
import logging
from typing import TYPE_CHECKING, Any, Dict, List
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.domain.entities.document_content import DocumentContent, Section, TableData
from app.core.files_config import BRAND_CONFIG, BASE_DIR
if TYPE_CHECKING:
    from docxtpl import DocxTemplate

logger = logging.getLogger(__name__)

# Rutas de recursos
_TEMPLATES_DIR = os.path.join(BASE_DIR, "assets", "templates")
_LOGOS_DIR = os.path.join(BASE_DIR, "assets", "logos")

class TemplateEngine:

    def __init__(self, brand: str = "convertia"):
        self._brand = brand
        self._brand_cfg = BRAND_CONFIG.get(brand, BRAND_CONFIG["convertia"])
        self._jinja_env = Environment(
            loader=FileSystemLoader(_TEMPLATES_DIR),
            autoescape=select_autoescape(["html"]),
        )

    def build_docx_context(
        self,
        content: DocumentContent,
        doc: "DocxTemplate",
    ) -> Dict[str, Any]:
        try:
            from docxtpl import InlineImage
            from docx.shared import Inches

            logo_path = self._brand_cfg["logos"].get("docs", "")
            logo = (
                InlineImage(doc, logo_path, width=Inches(1.5))
                if logo_path and os.path.exists(logo_path)
                else None
            )
        except Exception as e:
            logger.warning(f"No se pudo cargar el logo para DOCX: {e}")
            logo = None

        return {
            # Metadata del documento
            "title": content.title,
            "subtitle": content.subtitle or "",
            "author": content.author,
            "date": content.get_date(),
            "classification": content.classification,
            "logo": logo,

            # Secciones jerárquicas
            "sections": [self._section_to_dict(s) for s in content.sections],
            "sections_h1": [self._section_to_dict(s) for s in content.sections_by_level(1)],
            "sections_h2": [self._section_to_dict(s) for s in content.sections_by_level(2)],
            "sections_h3": [self._section_to_dict(s) for s in content.sections_by_level(3)],

            # Tablas globales
            "tables": [self._table_to_dict(t) for t in content.tables],

            # Branding
            "brand_name": self._brand_cfg.get("nametag", "Convertia"),
            "brand_colors": self._brand_cfg.get("colors", {}),
        }

    # PDF — contexto HTML para WeasyPrint

    def build_html_context(self, content: DocumentContent) -> str:
        try:
            template = self._jinja_env.get_template("report_template.html", "word_template.html")
        except Exception as e:
            logger.warning(f"Plantilla HTML no encontrada, usando template inline: {e}")
            return self._render_inline_html(content)

        logo_path = self._brand_cfg["logos"].get("docs", "")
        logo_src = f"file://{logo_path}" if logo_path and os.path.exists(logo_path) else ""

        context = {
            "title": content.title,
            "subtitle": content.subtitle or "",
            "author": content.author,
            "date": content.get_date(),
            "classification": content.classification,
            "sections": [self._section_to_dict(s) for s in content.sections],
            "tables": [self._table_to_dict(t) for t in content.tables],
            "logo_src": logo_src,
            "brand_name": self._brand_cfg.get("nametag", "Convertia"),
            "colors": self._brand_cfg.get("colors", {}),
        }

        return template.render(**context)
    #ppt
    def build_pptx_context(self, content: DocumentContent) -> Dict[str, Any]:
      
        slides = []

        # Slide de portada
        slides.append({
            "type": "cover",
            "title": content.title,
            "subtitle": content.subtitle or content.author,
            "date": content.get_date(),
            "classification": content.classification,
        })

        # Slides de contenido por sección
        section_count = 0
        for section in content.sections:
            if section.level == 1:
                section_count += 1
                slides.append({
                    "type": "section",
                    "number": section_count,
                    "title": section.title,
                    "subtitle": section.content[:120] if section.content else "",
                })
            elif section.level == 2:
                slide_data: Dict[str, Any] = {
                    "type": "content",
                    "title": section.title,
                    "content": section.content,
                    "bullets": section.bullets or [],
                }
                if section.table:
                    slide_data["table"] = self._table_to_dict(section.table)
                slides.append(slide_data)
            elif section.level == 3:
                # H3 se agrega al slide anterior si existe
                if slides and slides[-1]["type"] == "content":
                    prev = slides[-1]
                    prev["subheadings"] = prev.get("subheadings", [])
                    prev["subheadings"].append({
                        "title": section.title,
                        "content": section.content,
                        "bullets": section.bullets or [],
                    })
                else:
                    slides.append({
                        "type": "content",
                        "title": section.title,
                        "content": section.content,
                        "bullets": section.bullets or [],
                    })

        # Tablas globales como slides dedicados
        for table in content.tables:
            slides.append({
                "type": "table",
                "title": table.caption or "Datos",
                "table": self._table_to_dict(table),
            })

        # Slide de cierre
        slides.append({"type": "closing"})

        return {
            "slides": slides,
            "brand_name": self._brand_cfg.get("nametag", "Convertia"),
            "logo_path": self._brand_cfg["logos"].get("white", ""),
        }

  
    def build_excel_context(self, content: DocumentContent) -> Dict[str, Any]:
        sheets = []

        for i, table in enumerate(content.tables):
            sheets.append({
                "name": table.caption or f"Datos {i + 1}",
                "headers": table.headers,
                "rows": table.rows,
                "summary": table.summary,
            })

        for section in content.sections:
            if section.table:
                sheets.append({
                    "name": section.title[:31],  
                    "headers": section.table.headers,
                    "rows": section.table.rows,
                    "summary": section.table.summary,
                })

        if not sheets:
            sheets.append({
                "name": "Resumen",
                "headers": ["Sección", "Contenido"],
                "rows": [[s.title, s.content[:500]] for s in content.sections],
                "summary": None,
            })

        return {
            "title": content.title,
            "sheets": sheets,
            "excel_cfg": self._brand_cfg.get("excel", {}),
        }

    @staticmethod
    def _section_to_dict(section: Section) -> Dict[str, Any]:
        return {
            "title": section.title,
            "level": section.level,
            "content": section.content,
            "bullets": section.bullets or [],
            "has_bullets": bool(section.bullets),
            "table": (
                TemplateEngine._table_to_dict(section.table)
                if section.table else None
            ),
            "has_table": section.table is not None,
        }

    @staticmethod
    def _table_to_dict(table: TableData) -> Dict[str, Any]:
        return {
            "headers": table.headers,
            "rows": table.rows,
            "caption": table.caption or "",
            "row_count": table.row_count,
            "column_count": table.column_count,
        }


    def _render_inline_html(self, content: DocumentContent) -> str:
        colors = self._brand_cfg.get("colors", {})
        primary = colors.get("primary", "#011E23")
        accent = colors.get("accent_green", "#1AEB9F")

        sections_html = ""
        for section in content.sections:
            tag = f"h{section.level}"
            sections_html += f"<{tag}>{section.title}</{tag}>\n"
            if section.content:
                for para in section.content.split("\n"):
                    if para.strip():
                        sections_html += f"<p>{para}</p>\n"
            if section.bullets:
                sections_html += "<ul>\n"
                for bullet in section.bullets:
                    sections_html += f"  <li>{bullet}</li>\n"
                sections_html += "</ul>\n"
            if section.table:
                sections_html += self._table_to_html(section.table)

        tables_html = "".join(self._table_to_html(t) for t in content.tables)

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{content.title}</title>
<style>
  @page {{
    size: letter;
    margin: 2cm 1.8cm;
    @bottom-left {{ content: "© Convertia — Documentación interna"; font-size: 8pt; color: #888; }}
    @bottom-right {{ content: "Pág. " counter(page); font-size: 8pt; color: #888; }}
  }}
  body {{ font-family: Inter, Arial, sans-serif; font-size: 11pt; color: #1a202c; line-height: 1.6; }}
  .cover {{ page-break-after: always; padding-top: 80pt; }}
  .cover h1 {{ font-size: 36pt; color: {primary}; margin-bottom: 8pt; }}
  .cover .subtitle {{ font-size: 18pt; color: #4a5568; }}
  .cover .meta {{ margin-top: 60pt; font-size: 10pt; color: #718096; }}
  .accent-line {{ height: 3pt; width: 80pt; background: {accent}; margin: 12pt 0; }}
  h1 {{ font-size: 22pt; color: {primary}; margin-top: 24pt; page-break-after: avoid; }}
  h2 {{ font-size: 16pt; color: #10473f; margin-top: 18pt; page-break-after: avoid; }}
  h3 {{ font-size: 13pt; color: #2d3748; margin-top: 14pt; page-break-after: avoid; }}
  p {{ margin: 6pt 0; }}
  ul {{ padding-left: 20pt; margin: 6pt 0; }}
  li {{ margin: 3pt 0; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 9pt; }}
  thead th {{ background: {primary}; color: white; padding: 6pt 8pt; text-align: left; }}
  tbody tr:nth-child(even) {{ background: #f5f5f5; }}
  tbody td {{ padding: 5pt 8pt; border-bottom: 0.5pt solid #ddd; }}
</style>
</head>
<body>
  <div class="cover">
    <h1>{content.title}</h1>
    <div class="accent-line"></div>
    <div class="subtitle">{content.subtitle or content.author}</div>
    <div class="meta">
      <strong>Fecha:</strong> {content.get_date()}<br>
      <strong>Clasificación:</strong> {content.classification}
    </div>
  </div>
  {sections_html}
  {tables_html}
</body>
</html>"""

    @staticmethod
    def _table_to_html(table: TableData) -> str:
        header_cells = "".join(f"<th>{h}</th>" for h in table.headers)
        rows_html = ""
        for row in table.rows:
            cells = "".join(f"<td>{cell}</td>" for cell in row)
            rows_html += f"<tr>{cells}</tr>\n"
        caption = f"<caption>{table.caption}</caption>" if table.caption else ""
        return f"""<table>{caption}
  <thead><tr>{header_cells}</tr></thead>
  <tbody>{rows_html}</tbody>
</table>"""

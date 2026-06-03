
from __future__ import annotations
import re
from typing import List
from app.domain.entities.document_content import DocumentContent, Section, TableData

class MarkdownToDocumentContentParser:

    @classmethod
    def parse(cls, markdown: str) -> DocumentContent:
        if not markdown or not markdown.strip():
            return DocumentContent(title="Documento", sections=[], tables=[])

        markdown = cls._clean_conversational_noise(markdown)
        lines = markdown.split("\n")

        title = cls._detect_title(lines)
        sections: List[Section] = []
        global_tables: List[TableData] = []

        current_title = "Introducción"
        current_level = 2
        current_content: List[str] = []
        current_bullets: List[str] = []

        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            if stripped.replace("#", "").strip() == title and i < 5:
                i += 1
                continue

            if stripped.startswith("|"):
                table_lines = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    table_lines.append(lines[i].strip())
                    i += 1
                table = cls._parse_markdown_table(table_lines)
                if table:
                    global_tables.append(table)
                continue

            if stripped.startswith("### "):
                cls._flush_section(sections, current_title, current_level,
                                   current_content, current_bullets)
                current_title = cls._clean_md(stripped[4:])
                current_level = 3
                current_content = []
                current_bullets = []

            elif stripped.startswith("## "):
                cls._flush_section(sections, current_title, current_level,
                                   current_content, current_bullets)
                current_title = cls._clean_md(stripped[3:])
                current_level = 2
                current_content = []
                current_bullets = []

            elif stripped.startswith("# "):
                cls._flush_section(sections, current_title, current_level,
                                   current_content, current_bullets)
                current_title = cls._clean_md(stripped[2:])
                current_level = 1
                current_content = []
                current_bullets = []

            elif stripped.startswith(("- ", "* ")):
                current_bullets.append(cls._clean_md(stripped[2:]))

            elif stripped and stripped[0].isdigit() and ". " in stripped[:5]:
                dot = stripped.index(". ")
                current_bullets.append(cls._clean_md(stripped[dot + 2:]))

            elif stripped:
                current_content.append(cls._clean_md(stripped))

            i += 1

        # Volcar la última sección
        cls._flush_section(sections, current_title, current_level,
                           current_content, current_bullets)

        return DocumentContent(
            title=title,
            sections=sections,
            tables=global_tables,
        )

    # Helpers privados

    @staticmethod
    def _detect_title(lines: List[str]) -> str:
        for line in lines[:10]:
            stripped = line.strip()
            clean = stripped.replace("**", "").replace("#", "").strip()
            if stripped.startswith("# ") and clean:
                return clean
            if "Reporte de" in stripped or "Análisis" in stripped:
                return stripped.replace('"', "").replace("**", "").strip()
        return "Reporte Corporativo"

    @staticmethod
    def _flush_section(
        sections: List[Section],
        title: str,
        level: int,
        content: List[str],
        bullets: List[str],
    ) -> None:
        if content or bullets:
            sections.append(
                Section(
                    title=title,
                    level=level,
                    content="\n".join(content),
                    bullets=bullets if bullets else None,
                )
            )

    @staticmethod
    def _parse_markdown_table(table_lines: List[str]) -> TableData | None:
        rows = []
        for tline in table_lines:
            parts = [p.strip() for p in tline.split("|")]
            if parts and parts[0] == "":
                parts = parts[1:]
            if parts and parts[-1] == "":
                parts = parts[:-1]
            # Saltar fila separadora (|---|---|)
            if all(all(c in "-: " for c in cell) for cell in parts if cell):
                continue
            if parts:
                rows.append(parts)

        if not rows:
            return None

        headers = rows[0]
        data_rows = rows[1:]
        return TableData(headers=headers, rows=data_rows)

    @staticmethod
    def _clean_md(text: str) -> str:
        t = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
        t = re.sub(r"\*(.*?)\*", r"\1", t)
        t = re.sub(r"__(.*?)__", r"\1", t)
        t = re.sub(r"_(.*?)_", r"\1", t)
        if t.startswith('"') and t.endswith('"') and t.count('"') == 2:
            t = t[1:-1]
        return t.strip()

    @staticmethod
    def _clean_conversational_noise(content: str) -> str:
        lines = content.split("\n")
        patterns = [
            r"(?i)a\s+continuación,?\s+presento",
            r"(?i)dado\s+que\s+ha\s+solicitado",
            r"(?i)puede\s+descargar(lo)?\s+utilizando",
            r"(?i)descargar\s+este\s+reporte",
            r"(?i)botones\s+de\s+\"?pdf\"?\s+o\s+\"?word\"?",
            r"(?i)he\s+redactado\s+el\s+contenido",
            r"(?i)aquí\s+tiene\s+el\s+reporte",
            r"(?i)espero\s+que\s+este\s+reporte",
            r"(?i)al\s+final\s+de\s+esta\s+respuesta",
            r"(?i)utilizando\s+los\s+botones",
        ]
        filtered = [
            ln for ln in lines
            if not any(re.search(p, ln.strip()) for p in patterns)
        ]
        start = next(
            (i for i, ln in enumerate(filtered) if ln.strip() not in ["*", "**", "", "-", "_"]),
            0,
        )
        end = next(
            (i for i in range(len(filtered), 0, -1)
             if filtered[i - 1].strip() not in ["*", "**", "", "-", "_"]),
            len(filtered),
        )
        return "\n".join(filtered[start:end])

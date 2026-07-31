import logging
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder

logger = logging.getLogger(__name__)


class MdBuilder(IDocumentBuilder):

    @property
    def output_format(self) -> str:
        return "md"

    def build(self, content: DocumentContent) -> bytes:
        try:
            lines = []
            if content.title:
                lines.append(f"# {content.title}")
                lines.append("")
            if content.subtitle:
                lines.append(f"*{content.subtitle}*")
                lines.append("")

            for section in content.sections:
                header_prefix = "#" * min(section.level + 1, 6)
                lines.append(f"{header_prefix} {section.title}")
                lines.append("")
                if section.content:
                    lines.append(section.content)
                    lines.append("")
                if section.bullets:
                    for bullet in section.bullets:
                        lines.append(f"- {bullet}")
                    lines.append("")
                if section.table:
                    lines.append(self._format_table(section.table))
                    lines.append("")

            for table in content.tables:
                if table.caption:
                    lines.append(f"### {table.caption}")
                    lines.append("")
                lines.append(self._format_table(table))
                lines.append("")

            md_data = "\n".join(lines).strip()
            return md_data.encode("utf-8")
        except Exception as e:
            logger.error(f"Error generando MD '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo MD: {e}") from e

    def _format_table(self, table) -> str:
        if not table.headers:
            return ""
        header_line = "| " + " | ".join(str(h) for h in table.headers) + " |"
        sep_line = "| " + " | ".join("---" for _ in table.headers) + " |"

        lines = [header_line, sep_line]
        for row in table.rows:
            row_line = "| " + " | ".join(
                str(row[idx]) if idx < len(row) else ""
                for idx in range(len(table.headers))
            ) + " |"
            lines.append(row_line)
        return "\n".join(lines)

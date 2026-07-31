import logging
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.document_builder import IDocumentBuilder

logger = logging.getLogger(__name__)


class TxtBuilder(IDocumentBuilder):

    @property
    def output_format(self) -> str:
        return "txt"

    def build(self, content: DocumentContent) -> bytes:
        try:
            lines = []
            if content.title:
                lines.append(content.title)
                lines.append("=" * len(content.title))
                lines.append("")
            if content.subtitle:
                lines.append(content.subtitle)
                lines.append("")

            for section in content.sections:
                lines.append(section.title)
                lines.append("-" * len(section.title))
                if section.content:
                    lines.append(section.content)
                if section.bullets:
                    for bullet in section.bullets:
                        lines.append(f"• {bullet}")
                if section.table:
                    lines.append(self._format_table(section.table))
                lines.append("")

            for table in content.tables:
                if table.caption:
                    lines.append(table.caption)
                lines.append(self._format_table(table))
                lines.append("")

            txt_data = "\n".join(lines).strip()
            return txt_data.encode("utf-8")
        except Exception as e:
            logger.error(f"Error generando TXT '{content.title}': {e}")
            raise RuntimeError(f"Error al generar el archivo TXT: {e}") from e

    def _format_table(self, table) -> str:
        if not table.headers:
            return ""
        col_widths = [len(str(h)) for h in table.headers]
        for row in table.rows:
            for i, val in enumerate(row):
                if i < len(col_widths):
                    col_widths[i] = max(col_widths[i], len(str(val)))

        header_line = " | ".join(str(h).ljust(col_widths[i]) for i, h in enumerate(table.headers))
        sep_line = "-+-".join("-" * col_widths[i] for i in range(len(col_widths)))

        lines = [header_line, sep_line]
        for row in table.rows:
            row_str = " | ".join(
                str(val).ljust(col_widths[i]) if i < len(row) else "".ljust(col_widths[i])
                for i, val in enumerate(row)
            )
            lines.append(row_str)
        return "\n".join(lines)

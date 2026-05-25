"""
CSV document processor.
Extracts tables from CSV files with configurable delimiters.
"""

import csv
import io
import logging
from typing import Optional

from app.domain.entities.document import (
    DocumentType,
    ParsedContent,
    Section,
    Table,
)
from app.domain.interfaces.document_processor import IDocumentProcessor

logger = logging.getLogger(__name__)


class CsvProcessor(IDocumentProcessor):
    """
    Processes CSV files using Python's csv module.
    Supports various delimiters and formats.
    """

    def __init__(self, delimiter: Optional[str] = None):
        """
        Initialize CSV processor.
        
        Args:
            delimiter: CSV delimiter (default: auto-detect or comma)
        """
        self.delimiter = delimiter

    @property
    def supported_type(self) -> DocumentType:
        return DocumentType.CSV

    @property
    def supported_extensions(self) -> list[str]:
        return [".csv", ".tsv", ".txt"]

    async def parse(
        self,
        file_content: bytes,
        filename: str,
    ) -> ParsedContent:
        """
        Parse CSV file and extract table data.
        """
        try:
            # Decode bytes to string
            try:
                text_content = file_content.decode('utf-8')
            except UnicodeDecodeError:
                text_content = file_content.decode('latin-1')

            # Determine delimiter
            delimiter = self.delimiter
            if not delimiter:
                # Auto-detect for TSV
                if filename.endswith('.tsv'):
                    delimiter = '\t'
                else:
                    # Try comma as default
                    delimiter = ','

            # Parse CSV
            csv_file = io.StringIO(text_content)
            reader = csv.reader(csv_file, delimiter=delimiter)
            
            rows = list(reader)
            if not rows:
                raise ValueError("Empty CSV file")

            # Extract headers and data
            headers = rows[0] if rows else []
            data_rows = rows[1:] if len(rows) > 1 else []

            # Create table
            table = Table(
                headers=headers,
                rows=data_rows,
                name="CSV Data",
                metadata={"delimiter": delimiter, "rows": len(data_rows)}
            )

            # Create content text
            full_text = f"CSV File: {filename}\n"
            full_text += " | ".join(headers) + "\n"
            full_text += "-" * 50 + "\n"
            for row in data_rows:
                full_text += " | ".join(row) + "\n"

            # Create section
            section = Section(
                title="CSV Data",
                content=full_text,
                level=1,
                metadata={"type": "csv", "rows": len(data_rows), "columns": len(headers)}
            )

            metadata = {
                "rows": len(data_rows),
                "columns": len(headers),
                "delimiter": delimiter,
                "column_names": headers,
            }

            return ParsedContent(
                text=full_text.strip(),
                sections=[section],
                tables=[table],
                images=[],
                metadata=metadata,
            )

        except Exception as e:
            logger.error(f"CSV parsing error for {filename}: {str(e)}")
            raise ValueError(f"Failed to parse CSV: {str(e)}")

    def get_metadata(self, file_content: bytes) -> dict:
        """Extract CSV metadata without full parsing."""
        try:
            text_content = file_content.decode('utf-8', errors='ignore')
            lines = text_content.split('\n')[:2]  # First 2 lines
            
            if not lines or not lines[0]:
                return {"is_valid": False}

            # Count columns
            first_line = lines[0].split(',')
            
            return {
                "is_valid": True,
                "columns": len(first_line),
                "preview": lines[0][:100],
            }

        except Exception as e:
            logger.error(f"CSV metadata extraction error: {str(e)}")
            return {"is_valid": False, "error": str(e)}

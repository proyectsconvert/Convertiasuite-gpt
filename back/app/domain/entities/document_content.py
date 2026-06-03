
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TableData(BaseModel):

    headers: List[str]
    rows: List[List[Any]]
    caption: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None

    @property
    def row_count(self) -> int:
        return len(self.rows)

    @property
    def column_count(self) -> int:
        return len(self.headers)


class Section(BaseModel):
    title: str
    level: int = Field(default=1, ge=1, le=3)
    content: str = ""
    bullets: Optional[List[str]] = None
    table: Optional[TableData] = None  # Tabla inline dentro de la sección


class DocumentContent(BaseModel):

    title: str
    subtitle: Optional[str] = None
    author: str = "Olivia AI — ConvertGPT"
    date: Optional[str] = None  
    classification: str = "Confidencial Corporativo"
    metadata: Optional[Dict[str, Any]] = None
    sections: List[Section] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)  # Tablas globales
    brand: str = "convertia"  #key

    def get_date(self) -> str:
        if self.date:
            return self.date
        return datetime.now().strftime("%d / %m / %Y")

    def sections_by_level(self, level: int) -> List[Section]:
        return [s for s in self.sections if s.level == level]

    def all_tables(self) -> List[TableData]:
        result = list(self.tables)
        for section in self.sections:
            if section.table:
                result.append(section.table)
        return result

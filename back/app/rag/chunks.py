CHARS_PER_TOKEN = 4 


def split_into_chunks(text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
    """Split genérico por caracteres con solapamiento — fallback para texto plano."""
    max_chars = max_tokens * CHARS_PER_TOKEN
    overlap_chars = overlap * CHARS_PER_TOKEN

    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap_chars
    return chunks


def _table_to_text(table: dict, index: int) -> str:
    """Convierte {headers, rows, name} en un bloque de texto tabular legible."""
    headers = table.get("headers") or []
    rows = table.get("rows") or []
    if not headers and not rows:
        return ""

    lines = []
    if headers:
        lines.append(" | ".join(headers))
        lines.append(" | ".join(["---"] * len(headers)))
    for row in rows:
        lines.append(" | ".join(str(c) for c in row))

    name = table.get("name") or f"tabla_{index}"
    return f"Tabla: {name}\n" + "\n".join(lines)


def chunks_from_parsed_content(
    parsed_content: dict, max_tokens: int = 500, overlap: int = 50
) -> list[tuple[str, dict]]:
    """
    Recibe el dict serializado de ParsedContent (text, sections, tables, ...)
    tal como sale de la columna jsonb `documents.parsed_content`.
    Devuelve lista de (texto_chunk, metadata) lista para embeber.
    """
    results: list[tuple[str, dict]] = []

    sections = parsed_content.get("sections") or []
    if sections:
        for section in sections:
            content = (section.get("content") or "").strip()
            if not content:
                continue
            base_meta = {
                "type": "text",
                "page": (section.get("metadata") or {}).get("page"),
                "section_title": section.get("title"),
            }
            for i, sub in enumerate(split_into_chunks(content, max_tokens, overlap)):
                meta = dict(base_meta)
                if i > 0:
                    meta["sub_chunk"] = i
                results.append((sub, meta))
    else:
        for sub in split_into_chunks(parsed_content.get("text", ""), max_tokens, overlap):
            results.append((sub, {"type": "text"}))

    for idx, table in enumerate(parsed_content.get("tables") or []):
        table_text = _table_to_text(table, idx)
        if table_text:
            results.append((table_text, {"type": "table", "table_index": idx, "table_name": table.get("name")}))

    return results
"""
chunk_processor.py
------------------
Divide documentos tabulares grandes en fragmentos manejables para el modelo de IA.
Evita el truncamiento silencioso actual (hard-cap de 32,000 caracteres en upload_service).

Estrategia: Map-Reduce
  1. Cada chunk se analiza independientemente (map).
  2. Los resultados parciales se sintetizan en una respuesta final (reduce).
"""

import logging
import os

logger = logging.getLogger(__name__)


DEFAULT_CHUNK_CHARS = int(os.getenv("CHUNK_MAX_CHARS", 20_000))
MAX_CHUNKS = int(os.getenv("CHUNK_MAX_CHUNKS", 20))  # límite de seguridad


def split_text_into_chunks(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_CHARS,
) -> list[str]:
    """
    Divide un texto tabular en chunks respetando los saltos de línea.
    Args:
        text: Texto extraído del CSV/Excel.
        chunk_size: Tamaño máximo de cada chunk en caracteres.

    Returns:
        Lista de strings, cada uno siendo un fragmento del texto original.
    """
    if not text or len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0

    # Preservar el header (primera línea) en todos los chunks
    header_end = text.find("\n")
    header = text[:header_end + 1] if header_end != -1 else ""

    while start < len(text) and len(chunks) < MAX_CHUNKS:
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:])
            break

        # Buscar el último \n dentro del límite para no cortar filas
        last_newline = text.rfind("\n", start, end)
        if last_newline == -1 or last_newline <= start:
            last_newline = end

        chunk = text[start:last_newline]

        # Re-añadir el header en chunks que no sean el primero
        if start > 0 and header and not chunk.startswith(header.strip()):
            chunk = header + chunk

        chunks.append(chunk)
        start = last_newline + 1

    total_chars = len(text)
    covered_chars = sum(len(c) for c in chunks)
    if covered_chars < total_chars:
        logger.warning(
            "chunk_processor: Se alcanzó MAX_CHUNKS=%d. "
            "Cubierto %d/%d chars (%.1f%%). Considera aumentar CHUNK_MAX_CHUNKS.",
            MAX_CHUNKS,
            covered_chars,
            total_chars,
            (covered_chars / total_chars) * 100,
        )

    logger.info(
        "chunk_processor: texto=%d chars dividido en %d chunks (tamaño=%d)",
        total_chars,
        len(chunks),
        chunk_size,
    )

    return chunks


def build_partial_prompt(
    chunk: str,
    chunk_index: int,
    total_chunks: int,
    filename: str,
    user_question: str,
) -> str:
    """
    Construye el prompt para un chunk intermedio.
    Instruye al modelo a extraer insights sin sintetizar todavía.
    """
    return (
        f"## ANÁLISIS PARCIAL — Fragmento {chunk_index + 1} de {total_chunks}\n"
        f"### Archivo: {filename}\n\n"
        f"{chunk}\n\n"
        f"---\n"
        f"**Pregunta del usuario:** {user_question}\n\n"
        f"**Instrucción:** Analiza SOLO este fragmento. "
        f"Extrae los datos, patrones o cifras clave que sean relevantes para la pregunta. "
        f"No saques conclusiones finales todavía. Sé conciso."
    )


def build_synthesis_prompt(
    partial_results: list[str],
    user_question: str,
    filename: str,
    total_chunks: int,
) -> str:
    combined = "\n\n---\n\n".join(
        f"### Resultado fragmento {i + 1}:\n{r}"
        for i, r in enumerate(partial_results)
    )

    return (
        f"## SÍNTESIS FINAL — {filename} ({total_chunks} fragmentos procesados)\n\n"
        f"A continuación están los análisis parciales de cada fragmento del archivo:\n\n"
        f"{combined}\n\n"
        f"---\n"
        f"**Pregunta del usuario:** {user_question}\n\n"
        f"**Instrucción:** Con base en TODOS los fragmentos anteriores, "
        f"proporciona una respuesta completa, precisa y bien estructurada. "
        f"Integra los datos de todos los fragmentos. Si hay contradicciones, menciónelas."
    )


def needs_chunking(text: str, chunk_size: int = DEFAULT_CHUNK_CHARS) -> bool:
    """Retorna True si el texto requiere procesamiento por chunks."""
    return len(text) > chunk_size

import httpx
import logging

from app.core.config import get_settings
from app.core.model_config import get_model_info

logger = logging.getLogger(__name__)

setting = get_settings()
_EMBED_INFO = get_model_info("nomic-embed-text")

# Cliente reutilizable con connection pooling — evita crear TCP+SSL por cada request
_embed_client = httpx.AsyncClient(
    timeout=httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0),
    limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
)


async def embed_text(text: str) -> list[float]:
    resp = await _embed_client.post(
        f"{setting.ollama_base_url}/api/embed",
        json={
            "model": _EMBED_INFO["model"],
            "input": text,
            "options": _EMBED_INFO["options"],
        },
    )
    resp.raise_for_status()
    return resp.json()["embeddings"][0]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    resp = await _embed_client.post(
        f"{setting.ollama_base_url}/api/embed",
        json={
            "model": _EMBED_INFO["model"],
            "input": texts,
            "options": _EMBED_INFO["options"],
        },
    )
    resp.raise_for_status()
    return resp.json()["embeddings"]


async def warmup_embed_client() -> None:
    try:
        await embed_text("warmup")
        logger.info("Embed client warmup completed")
    except Exception as e:
        logger.warning("Embed client warmup failed (non-fatal): %s", e)
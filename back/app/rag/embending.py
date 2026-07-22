import httpx

from app.core.config import settings
from app.core.model_config import get_model_info

setting = settings()
_EMBED_INFO = get_model_info("nomic-embed-text")

async def embed_text(text:str) ->list[float]:
    "embending en un solo texto"

    async with httpx.AsyncClient(timeout=120) as client:
        resp =await client.post(
            f"{setting.ollama_base_url}/api/embed",
            json={
                "model": _EMBED_INFO["model"],
                "input": text,
                "options": _EMBED_INFO["options"]
            }
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

async def embed_batch(texts: list[str])->list[list[float]]:
    "Genera embendings en batch de textos"
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            f"{setting.ollama_base_url}/api/embed",
            json ={
                "model": _EMBED_INFO["model"],
                "input": texts,
                "options": _EMBED_INFO["options"]
            }
        )
        resp.raise_for_status()
        return resp.json()["embeddings"]
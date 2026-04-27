import httpx
from app.core.config import get_settings


class OllamaClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or get_settings().ollama_base_url

    async def generate(self, prompt: str, model: str, temperature: float = None, num_ctx: int = None) -> str:
        payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, ...],
        "stream": False,

        }
        if temperature is not None:
            payload["temperature"] = temperature
        if num_ctx is not None:
            payload["num_ctx"] = num_ctx

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            return response.json().get("response", "")
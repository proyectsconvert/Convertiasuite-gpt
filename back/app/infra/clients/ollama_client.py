import httpx
import json
import asyncio
import logging
from app.core.config import get_settings
from app.security.ollama_rate_limiter import ollama_rate_limiter

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or get_settings().ollama_base_url

        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=180.0,
                write=10.0,
                pool=10.0,
            ),
            limits=httpx.Limits(
                max_connections=50,
                max_keepalive_connections=10,
            ),
            follow_redirects=True,
        )

    def _build_payload(self, prompt, model, stream, temperature, num_ctx):
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
        }

        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if num_ctx is not None:
            options["num_ctx"] = num_ctx

        if options:
            payload["options"] = options

        return payload

    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
    ) -> str:
        payload = self._build_payload(prompt, model, False, temperature, num_ctx)

        response = await self.client.post(
            f"{self.base_url}/api/generate",
            json=payload,
        )

        response.raise_for_status()
        return response.json().get("response", "")

    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
        max_retries: int = 3,
    ):
        for attempt in range(max_retries):
            await ollama_rate_limiter.wait_and_acquire("ollama")

            payload = self._build_payload(prompt, model, True, temperature, num_ctx)
            emitted = False 

            try:
                async with self.client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json=payload,
                ) as response:
                    if response.status_code == 429:
                        logger.warning(f"Ollama rate limit hit, attempt {attempt + 1}/{max_retries}")
                        await asyncio.sleep(2 ** attempt)
                        continue

                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line:
                            continue

                        try:
                            data = json.loads(line)
                            if "response" in data and data["response"]:
                                emitted = True
                                yield data["response"]
                        except json.JSONDecodeError:
                            continue
                    
                    # Si el stream terminó sin emitir nada
                    if not emitted:
                        logger.warning(f"Stream vacío para modelo {model}, reintentando...")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        else:
                            raise Exception("Stream vacío después de varios intentos")
                    return
            except Exception as e:
                logger.error(f"Ollama request failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def close(self):
        await self.client.aclose()
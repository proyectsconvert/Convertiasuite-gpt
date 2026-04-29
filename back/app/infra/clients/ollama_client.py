import httpx
import json
from app.core.config import get_settings


class OllamaClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or get_settings().ollama_base_url

        # Cliente persistente (NO recrear por request)
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
    ):
        payload = self._build_payload(prompt, model, True, temperature, num_ctx)

        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/generate",
            json=payload,
        ) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if not line:
                    continue

                try:
                    data = json.loads(line)
                    if "response" in data:
                        yield data["response"]
                except json.JSONDecodeError:
                    continue

    async def close(self):
        await self.client.aclose()
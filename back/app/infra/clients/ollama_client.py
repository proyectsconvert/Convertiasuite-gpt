import httpx
import json
import asyncio
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Semáforos por modelo para controlar concurrencia sin serializar todos los requests.
# Permite hasta 2 requests simultáneos por modelo (ajustable por env var).
import os
_MODEL_CONCURRENCY = int(os.getenv("OLLAMA_MODEL_CONCURRENCY", "2"))
_model_semaphores: dict[str, asyncio.Semaphore] = {}


def _get_semaphore(model: str) -> asyncio.Semaphore:
    """Obtiene o crea un semáforo de concurrencia para el modelo dado."""
    if model not in _model_semaphores:
        _model_semaphores[model] = asyncio.Semaphore(_MODEL_CONCURRENCY)
    return _model_semaphores[model]


class OllamaClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or get_settings().ollama_base_url

        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=600.0,  # Aumentado a 10 minutos para prompts gigantes
                write=10.0,
                pool=10.0,
            ),
            limits=httpx.Limits(
                max_connections=50,
                max_keepalive_connections=50,
            ),
            follow_redirects=True,
        )

    def _build_payload(
        self, prompt, model, stream, temperature, num_ctx, max_tokens=None
    ):
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            # keep_alive=-1 mantiene el modelo en VRAM indefinidamente.
            # Elimina el cold-start en cada request cuando hay tiempo entre peticiones.
            "keep_alive": -1,
        }

        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if num_ctx is not None:
            options["num_ctx"] = num_ctx
        if max_tokens is not None:
            options["num_predict"] = max_tokens  # Ollama usa num_predict, no max_tokens

        if options:
            payload["options"] = options

        return payload

    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
        max_tokens: int = None,
    ) -> str:
        payload = self._build_payload(
            prompt, model, False, temperature, num_ctx, max_tokens
        )

        async with _get_semaphore(model):
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )

        response.raise_for_status()
        return response.json().get("response", "")

    async def generate_chat(
        self,
        messages: list,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
        max_tokens: int = None,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "keep_alive": -1,
        }

        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if num_ctx is not None:
            options["num_ctx"] = num_ctx
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        if options:
            payload["options"] = options

        async with _get_semaphore(model):
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )

        response.raise_for_status()
        return response.json().get("message", {}).get("content", "")

    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
        max_tokens: int = None,
        max_retries: int = 3,
    ):
        semaphore = _get_semaphore(model)

        for attempt in range(max_retries):
            payload = self._build_payload(
                prompt, model, True, temperature, num_ctx, max_tokens
            )
            emitted = False

            try:
                async with semaphore:
                    async with self.client.stream(
                        "POST",
                        f"{self.base_url}/api/generate",
                        json=payload,
                    ) as response:
                        if response.status_code == 429:
                            logger.warning(
                                f"Ollama rate limit hit, attempt {attempt + 1}/{max_retries}"
                            )
                            await asyncio.sleep(2**attempt)
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
                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                continue

                        if not emitted:
                            logger.warning(
                                f"Stream vacío para modelo {model}, reintentando..."
                            )
                            if attempt < max_retries - 1:
                                await asyncio.sleep(2**attempt)
                                continue
                            else:
                                raise Exception("Stream vacío después de varios intentos")
                        return
            except Exception as e:
                logger.error(
                    f"Ollama request failed (attempt {attempt + 1}/{max_retries}): {e}"
                )
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2**attempt)

    async def generate_chat_stream(
        self,
        messages: list,
        model: str,
        temperature: float = None,
        num_ctx: int = None,
        max_tokens: int = None,
        max_retries: int = 3,
    ):
        semaphore = _get_semaphore(model)

        for attempt in range(max_retries):
            payload = {
                "model": model,
                "messages": messages,
                "stream": True,
                "keep_alive": -1,
            }

            options = {}
            if temperature is not None:
                options["temperature"] = temperature
            if num_ctx is not None:
                options["num_ctx"] = num_ctx
            if max_tokens is not None:
                options["num_predict"] = max_tokens

            if options:
                payload["options"] = options

            emitted = False

            try:
                logger.info(f"chat_request model={model} messages={len(messages)}")

                async with semaphore:
                    async with self.client.stream(
                        "POST",
                        f"{self.base_url}/api/chat",
                        json=payload,
                    ) as response:
                        if response.status_code == 429:
                            logger.warning(
                                f"Ollama rate limit hit (chat), attempt {attempt + 1}/{max_retries}"
                            )
                            await asyncio.sleep(2**attempt)
                            continue

                        response.raise_for_status()

                        async for line in response.aiter_lines():
                            if not line:
                                continue

                            try:
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    content = data["message"]["content"]
                                    if content:
                                        emitted = True
                                        yield content
                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                continue

                        if not emitted:
                            logger.warning(
                                f"Chat stream vacío para modelo {model}, reintentando..."
                            )
                            if attempt < max_retries - 1:
                                await asyncio.sleep(2**attempt)
                                continue
                            else:
                                raise Exception(
                                    "Chat stream vacío después de varios intentos"
                                )
                        return
            except Exception as e:
                logger.error(
                    f"Ollama chat request failed (attempt {attempt + 1}/{max_retries}): {e}"
                )
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2**attempt)

    async def preload_model(self, model: str) -> bool:
        """
        Pre-carga el modelo en VRAM con keep_alive=-1.
        Llamado al arrancar la app para eliminar cold-start en el primer request.
        """
        try:
            payload = {
                "model": model,
                "messages": [],
                "stream": False,
                "keep_alive": -1,  # Mantener en VRAM indefinidamente
            }
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=60.0,
            )
            response.raise_for_status()
            logger.info(f"Modelo {model} pre-cargado exitosamente en Ollama (keep_alive=-1).")
            return True
        except Exception as e:
            logger.error(f"Error al pre-cargar modelo {model}: {e}")
            return False

    async def close(self):
        await self.client.aclose()


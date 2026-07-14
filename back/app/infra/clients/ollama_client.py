import httpx
import json
import asyncio
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
import os

DEFAULT_HTTP_TIMEOUT = httpx.Timeout(
    connect=10.0,
    read=120.0,
    write=10.0,
    pool=10.0,
)

_MODEL_CONCURRENCY = int(os.getenv("OLLAMA_MODEL_CONCURRENCY", "1"))
_model_semaphores: dict[str, asyncio.Semaphore] = {}


def _get_semaphore(model: str) -> asyncio.Semaphore:
    if model not in _model_semaphores:
        _model_semaphores[model] = asyncio.Semaphore(_MODEL_CONCURRENCY)
    return _model_semaphores[model]


class OllamaClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or get_settings().ollama_base_url

        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=600.0,
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
                timeout=DEFAULT_HTTP_TIMEOUT,
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
        think: bool = None,  # <-- NUEVO
        extra_options: dict | None = None,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "keep_alive": -1,
        }
        if think is not None:  # <-- NUEVO
            payload["think"] = think

        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if num_ctx is not None:
            options["num_ctx"] = num_ctx
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        if extra_options:
            options.update(extra_options)

        if options:
            payload["options"] = options

        async with _get_semaphore(model):
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=DEFAULT_HTTP_TIMEOUT,
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
        max_retries: int = 5,
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
                                await asyncio.sleep(1 + 2**attempt)
                                continue
                            else:
                                raise Exception(
                                    "Stream vacío después de varios intentos"
                                )
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
        think: bool = None,  # <-- NUEVO
        extra_options: dict | None = None,
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
            if think is not None:  # <-- NUEVO
                payload["think"] = think

            options = {}
            if temperature is not None:
                options["temperature"] = temperature
            if num_ctx is not None:
                options["num_ctx"] = num_ctx
            if max_tokens is not None:
                options["num_predict"] = max_tokens
            if extra_options:
                options.update(extra_options)

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
                            await asyncio.sleep(1 + 2**attempt)
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
                                await asyncio.sleep(1 + 2**attempt)
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

    async def preload_model(self, model: str, max_retries: int = 5) -> bool:
        # Usar timeout más generoso para precalentamiento (15 min de lectura)
        warmup_timeout = httpx.Timeout(
            connect=10.0,
            read=900.0,  # 15 minutos para precalentamiento
            write=10.0,
            pool=10.0,
        )

        # Consulta simple para calentar el modelo
        warmup_prompt = "Responde 'OK'"

        for attempt in range(max_retries):
            try:
                logger.info(
                    f"Precalentando modelo {model} (intento {attempt + 1}/{max_retries})..."
                )

                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "Eres un asistente útil."},
                        {"role": "user", "content": warmup_prompt},
                    ],
                    "stream": False,
                    "keep_alive": -1,  # Mantener cargado indefinidamente
                }

                response = await self.client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    timeout=warmup_timeout,
                )
                response.raise_for_status()

                result = response.json()
                if "message" in result and "content" in result["message"]:
                    content = result["message"]["content"]
                    logger.info(
                        f"✓ Modelo {model} precalentado exitosamente en Ollama "
                        f"(keep_alive=-1, respuesta_chars={len(content)})"
                    )
                    return True
                else:
                    logger.warning(f"Respuesta inválida del modelo {model}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2**attempt)
                        continue
                    return False

            except asyncio.TimeoutError as e:
                logger.warning(
                    f"Timeout precalentando {model} (intento {attempt + 1}/{max_retries}): {e}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(5 * (attempt + 1))  # Espera progresiva
                    continue

            except Exception as e:
                logger.error(
                    f"Error precalentando {model} (intento {attempt + 1}/{max_retries}): {e}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(2**attempt)
                    continue

        logger.error(
            f"✗ No se pudo precalentar modelo {model} después de {max_retries} intentos"
        )
        return False

    async def close(self):
        await self.client.aclose()

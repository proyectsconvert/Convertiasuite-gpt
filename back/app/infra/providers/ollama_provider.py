from app.domain.interfaces.llm_provider import ILlmProvider
from app.core.model_config import get_model_config
from app.services.prompts.prompt_templates import build_messages
from app.domain.entities.message import Message
from datetime import datetime, UTC
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)


class OllamaProvider(ILlmProvider):
    def __init__(self, ollama_client):
        self.client = ollama_client
        self.models = None

    async def generate(
        self, messages: list, model_key: str
    ) -> AsyncGenerator[str, None]:
        models = get_model_config()
        model_info = models.get(model_key, models["default"])

        msg_dict = build_messages(messages, model_key)
        # Ensure language enforcement is explicit and at the top of the system prompt
        if msg_dict and "system" in msg_dict:
            enforced = "Responde SIEMPRE en español. Respuestas solo en español.\n\n"
            msg_dict["system"] = enforced + msg_dict["system"]

        chat_messages = [{"role": "system", "content": msg_dict["system"]}]
        for msg in msg_dict["messages"]:
            chat_messages.append(msg)

        logger.info(
            "OllamaProvider sending model=%s for model_key=%s (chat stream)",
            model_info.get("model"),
            model_key,
        )

        # Emitir streaming de la respuesta para mejorar latencia percibida
        async for chunk in self.client.generate_chat_stream(
            messages=chat_messages,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
            max_tokens=model_info.get("max_tokens"),
            think=model_info.get("think", False),
        ):
            yield chunk

    async def generate_once(
        self, prompt: str, model_key: str
    ) -> AsyncGenerator[str, None]:
        models = get_model_config()
        model_info = models.get(model_key, models["default"])

        system_prompt = (
            "Eres un analista de datos experto. "
            "Responde SIEMPRE en español. "
            "Analiza los datos proporcionados y responde de forma concisa y estructurada."
        )

        chat_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        logger.info(
            "OllamaProvider.generate_once model=%s model_key=%s prompt_chars=%d",
            model_info.get("model"),
            model_key,
            len(prompt),
        )

        # For generate_once we also stream the response
        async for chunk in self.client.generate_chat_stream(
            messages=chat_messages,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
            max_tokens=model_info.get("max_tokens"),
            think=model_info.get("think", False),
        ):
            yield chunk

    async def generate_stream(self, messages: list, model_key: str):
        models = get_model_config()
        model_info = models.get(model_key, models["default"])

        msg_dict = build_messages(messages, model_key)
        # Ensure language enforcement is explicit and at the top of the system prompt
        if msg_dict and "system" in msg_dict:
            enforced = "Responde SIEMPRE en español. Respuestas solo en español.\n\n"
            msg_dict["system"] = enforced + msg_dict["system"]

        logger.debug(
            f"model_key={model_key} model={model_info['model']} messages={len(msg_dict['messages'])}"
        )

        chat_messages = [{"role": "system", "content": msg_dict["system"]}]

        for msg in msg_dict["messages"]:
            chat_messages.append(msg)

        # Log the exact model sent to the client for easier debugging
        logger.info(
            "OllamaProvider sending model=%s for model_key=%s",
            model_info.get("model"),
            model_key,
        )
        async for chunk in self.client.generate_chat_stream(
            messages=chat_messages,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
            max_tokens=model_info.get("max_tokens"),
            think=model_info.get("think", False),  # <-- NUEVO
        ):
            yield chunk

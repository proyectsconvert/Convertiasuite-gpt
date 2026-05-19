from app.domain.interfaces.llm_provider import ILlmProvider
from app.core.model_config import get_model_config
from app.services.prompts.prompt_templates import build_messages
import logging

logger = logging.getLogger(__name__)


class OllamaProvider(ILlmProvider):
    def __init__(self, ollama_client):
        self.client = ollama_client
        self.models = get_model_config()

    async def generate(self, messages: list, model_key: str) -> str:
        model_info = self.models.get(model_key, self.models["default"])

        # Usar build_messages en lugar de build_prompt
        msg_dict = build_messages(messages, model_key)

        # Convertir al formato que espera la API /api/chat
        prompt = f"{msg_dict['system']}\n\n--- Conversation ---\n\n"
        for msg in msg_dict["messages"]:
            prompt += f"{msg['role']}: {msg['content']}\n\n"

        return await self.client.generate(
            prompt=prompt,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
            max_tokens=model_info.get("max_tokens"),
        )

    async def generate_stream(self, messages: list, model_key: str):
        model_info = self.models.get(model_key, self.models["default"])

        # Construir los mensajes con el sistema incluido
        msg_dict = build_messages(messages, model_key)

        logger.debug(
            f"model_key={model_key} model={model_info['model']} messages={len(msg_dict['messages'])}"
        )

        chat_messages = [{"role": "system", "content": msg_dict["system"]}]

        for msg in msg_dict["messages"]:
            chat_messages.append(msg)

        async for chunk in self.client.generate_chat_stream(
            messages=chat_messages,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
            max_tokens=model_info.get("max_tokens"),
        ):
            yield chunk

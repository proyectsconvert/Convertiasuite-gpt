from app.domain.interfaces.llm_provider import ILlmProvider
from app.core.model_config import get_model_config
from app.services.prompts.prompt_templates import build_prompt


class OllamaProvider(ILlmProvider):
    def __init__(self, ollama_client):
        self.client = ollama_client
        self.models = get_model_config()

    async def generate(self, messages: list, model_key: str) -> str:
        model_info = self.models.get(model_key, self.models["default"])

        prompt = build_prompt(messages, model_key)

        return await self.client.generate(
            prompt=prompt,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
        )

    async def generate_stream(self, messages: list, model_key: str):
        """
        Generator that yields streaming response chunks.
        """
        model_info = self.models.get(model_key, self.models["default"])
        prompt = build_prompt(messages, model_key)

        async for chunk in self.client.generate_stream(
            prompt=prompt,
            model=model_info["model"],
            temperature=model_info.get("temperature"),
            num_ctx=model_info.get("num_ctx"),
        ):
            yield chunk
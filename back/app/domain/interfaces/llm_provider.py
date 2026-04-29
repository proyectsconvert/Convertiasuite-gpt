from abc import ABC, abstractmethod


class ILlmProvider(ABC):
    @abstractmethod
    async def generate(self, messages: list, model_key: str) -> str:
        pass

    @abstractmethod
    async def generate_stream(self, messages: list, model_key: str):
        pass
from abc import ABC, abstractmethod


class ILlmProvider(ABC):
    @abstractmethod
    async def generate(self, messages: list, model_key: str) -> str:
        pass

    @abstractmethod
    async def generate_stream(self, messages: list, model_key: str):
        pass

    @abstractmethod
    async def generate_once(self, prompt: str, model_key: str) -> str:
        """
        Inferencia de turno único con un prompt raw (sin historial de chat).
        Usado principalmente por el pipeline de chunking Map-Reduce.
        """
        pass
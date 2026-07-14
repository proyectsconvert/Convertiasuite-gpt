from abc import ABC, abstractmethod
from typing import AsyncGenerator


class ILlmProvider(ABC):
    @abstractmethod
    async def generate(
        self, messages: list, model_key: str
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def generate_stream(
        self, messages: list, model_key: str
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def generate_once(
        self, prompt: str, model_key: str
    ) -> AsyncGenerator[str, None]:
        pass

from abc import ABC, abstractmethod


class IMessageRepository(ABC):

    @abstractmethod
    async def get_messages(
        self,
        session_id: str,
        limit: int = 50,
    ) -> list | None:
        pass

    @abstractmethod
    async def save_messages(
        self,
        session_id: str,
        messages: list,
    ) -> None:
        pass

    @abstractmethod
    async def get_context_window(
        self,
        session_id: str,
        window_size: int,
    ) -> list:
        pass

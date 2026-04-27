from abc import ABC, abstractmethod
from typing import Optional


class IMemoryRepository(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[list]:
        pass

    @abstractmethod
    async def set(self, key: str, value: list) -> None:
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        pass

    @abstractmethod
    async def get_session_list(self, user_id: str) -> list:
        pass

    @abstractmethod
    async def create_session(self, user_id: str, title: str) -> str:
        pass

    @abstractmethod
    async def delete_session(self, user_id: str, session_id: str) -> None:
        pass
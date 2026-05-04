from abc import ABC, abstractmethod
from typing import Optional
from app.domain.entities.chat_session import ChatSession
from app.domain.entities.message import Message


class IChatRepository(ABC):
 
    @abstractmethod
    async def get_session(self, session_id: str, user_id: str) -> Optional[ChatSession]:
        pass

    @abstractmethod
    async def save_session(self, session: ChatSession) -> None:
        pass

    @abstractmethod
    async def create_session(self, user_id: str, title: str) -> str:
        pass

    @abstractmethod
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> list:
        pass

    @abstractmethod
    async def delete_session(self, session_id: str, user_id: str) -> None:
        pass

    @abstractmethod
    async def add_message(self, session_id: str, user_id: str, message: Message) -> None:
        pass

    @abstractmethod
    async def get_messages(self, session_id: str, user_id: str, limit: int = 50) -> Optional[list]:
        pass

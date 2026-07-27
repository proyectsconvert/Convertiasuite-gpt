from abc import ABC, abstractmethod


class ISessionRepository(ABC):

    @abstractmethod
    async def get_session(
        self,
        session_id: str,
    ) -> dict | None:
        pass

    @abstractmethod
    async def create_session(
        self,
        user_id: str,
        title: str,
        session_id: str | None = None,
    ) -> str:
        pass

    @abstractmethod
    async def get_session_list(
        self,
        user_id: str,
        limit: int = 20,
        cursor_updated_at: str | None = None,
        cursor_id: str | None = None,
    ) -> dict:
        pass

    @abstractmethod
    async def update_session(
        self,
        session_id: str,
        title: str,
    ) -> None:
        pass

    @abstractmethod
    async def delete_session(
        self,
        user_id: str,
        session_id: str,
    ) -> None:
        pass
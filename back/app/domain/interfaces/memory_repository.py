from abc import ABC, abstractmethod


class IMemoryRepository(ABC):

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
    ) -> list:
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

    @abstractmethod
    async def get_context_window(
        self,
        session_id: str,
        window_size: int,
    ) -> list:
        pass

    @abstractmethod
    async def save_attachment(
        self,
        session_id: str,
        storage_path: str,
        file_name: str,
        mime_type: str | None,
        file_size: int | None,
        extracted_text: str | None = None,
    ) -> str:
        pass

    @abstractmethod
    async def get_attachments(
        self,
        session_id: str,
    ) -> list:
        pass
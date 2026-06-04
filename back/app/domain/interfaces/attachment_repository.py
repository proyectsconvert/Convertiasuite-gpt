from abc import ABC, abstractmethod


class IAttachmentRepository(ABC):

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

import logging
from typing import Optional, List

from app.domain.interfaces.session_repository import ISessionRepository
from app.domain.interfaces.message_repository import IMessageRepository
from app.domain.interfaces.attachment_repository import IAttachmentRepository
from app.domain.interfaces.ai_generated_files import IAIGeneratedFilesRepository

from app.infra.repositories.supabase.memory_repository import SupabaseMemoryRepository
from app.infra.repositories.redis.cache_repository import RedisCacheRepository

logger = logging.getLogger(__name__)


class CompositeMemoryRepository(
    ISessionRepository,
    IMessageRepository,
    IAttachmentRepository,
    IAIGeneratedFilesRepository,
):
    def __init__(self, *, cache: RedisCacheRepository, db: SupabaseMemoryRepository):
        self.cache = cache
        self.db = db

    async def start_stream(self, session_id: str) -> None:
        return await self.cache.start_stream(session_id)

    async def stop_stream(self, session_id: str) -> bool:
        return await self.cache.stop_stream(session_id)

    async def should_stop_stream(self, session_id: str) -> bool:
        return await self.cache.should_stop_stream(session_id)

    async def cleanup_stream(self, session_id: str) -> None:
        return await self.cache.cleanup_stream(session_id)

    # Session operations (delegate to Supabase)
    async def create_session(
        self, user_id: str, title: str, session_id: Optional[str] = None
    ) -> str:
        return await self.db.create_session(user_id, title, session_id)

    async def get_session(self, session_id: str) -> Optional[dict]:
        return await self.db.get_session(session_id)

    async def get_session_list(self, user_id: str) -> List[dict]:
        return await self.db.get_session_list(user_id)

    async def update_session(self, session_id: str, title: str) -> None:
        return await self.db.update_session(session_id, title)

    async def delete_session(self, user_id: str, session_id: str) -> None:
        return await self.db.delete_session(user_id, session_id)

    # Message operations (delegate to Supabase)
    async def get_messages(
        self, session_id: str, limit: int = 50
    ) -> Optional[List[dict]]:
        return await self.db.get_messages(session_id, limit)

    async def save_messages(self, session_id: str, messages: List[dict]) -> None:
        return await self.db.save_messages(session_id, messages)

    async def get_context_window(self, session_id: str, window_size: int) -> List[dict]:
        return await self.db.get_context_window(session_id, window_size)

    # Attachment operations (delegate to Supabase)
    async def save_attachment(
        self,
        session_id: str,
        storage_path: str,
        file_name: str,
        mime_type: Optional[str] = None,
        file_size: Optional[int] = None,
        extracted_text: Optional[str] = None,
    ) -> str:
        return await self.db.save_attachment(
            session_id,
            storage_path,
            file_name,
            mime_type,
            file_size,
            extracted_text,
        )

    async def get_attachments(self, session_id: str) -> List[dict]:
        return await self.db.get_attachments(session_id)

    # AI generated files
    async def save_ai_file(
        self,
        session_id: str,
        user_id: str,
        file_type: str,
        storage_path: str,
        file_name: str,
        metadata: Optional[dict] = None,
        expires_at: Optional[str] = None,
    ) -> str:
        return await self.db.save_ai_file(
            session_id,
            user_id,
            file_type,
            storage_path,
            file_name,
            metadata,
            expires_at,
        )

    async def get_ai_files(
        self,
        session_id: str,
        file_type: Optional[str] = None,
    ) -> List[dict]:
        return await self.db.get_ai_files(session_id, file_type)

    async def get_ai_file_by_id(
        self,
        file_id: str,
    ) -> Optional[dict]:
        return await self.db.get_ai_file_by_id(file_id)

    async def soft_delete_ai_file(
        self,
        file_id: str,
        user_id: str,
    ) -> bool:
        return await self.db.soft_delete_ai_file(file_id, user_id)

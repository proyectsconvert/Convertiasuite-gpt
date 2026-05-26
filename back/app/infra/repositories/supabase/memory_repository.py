import uuid
import logging
from datetime import datetime, UTC
from typing import Optional

from app.domain.interfaces.session_repository import ISessionRepository
from app.domain.interfaces.message_repository import IMessageRepository
from app.domain.interfaces.attachment_repository import IAttachmentRepository
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SupabaseMemoryRepository(ISessionRepository, IMessageRepository, IAttachmentRepository):
    def __init__(self, supabase_client: Optional[SupabaseClient] = None):
        self.client = supabase_client or SupabaseClient()

    @property
    def supabase(self):
        return self.client.db

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()

    async def get_messages(
        self,
        session_id: str,
        limit: int = 50,
    ) -> list | None:
        try:
            response = (
                self.supabase.table("chat_conversations")
                .select("messages")
                .eq("session_id", session_id)
                .maybe_single()
                .execute()
            )

            if not response or not response.data:
                return []

            messages = response.data.get("messages", []) or []
            return messages[-limit:]

        except Exception as e:
            logger.error(
                "Error fetching messages session=%s error=%s",
                session_id,
                str(e),
            )
            return None

    async def save_messages(
        self,
        session_id: str,
        messages: list,
    ) -> None:
        try:
            session_response = (
                self.supabase.table("chat_sessions")
                .select("user_id")
                .eq("session_id", session_id)
                .is_("deleted_at", "null")
                .maybe_single()
                .execute()
            )

            if not session_response or not session_response.data:
                raise ValueError(f"Session not found: {session_id}")

            user_id = session_response.data["user_id"]
            now = self._now()

            (
                self.supabase.table("chat_conversations")
                .upsert(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "messages": messages,
                        "updated_at": now,
                    },
                    on_conflict="session_id",
                )
                .execute()
            )

            (
                self.supabase.table("chat_sessions")
                .update({"updated_at": now})
                .eq("session_id", session_id)
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error saving messages session=%s error=%s",
                session_id,
                str(e),
            )
            raise

    async def get_session(
        self,
        session_id: str,
    ) -> dict | None:
        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("session_id", session_id)
                .is_("deleted_at", "null")
                .maybe_single()
                .execute()
            )

            return response.data if response else None

        except Exception as e:
            logger.error(
                "Error fetching session=%s error=%s",
                session_id,
                str(e),
            )
            return None

    async def create_session(
        self,
        user_id: str,
        title: str,
        session_id: str | None = None,
    ) -> str:
        try:
            session_id = session_id or str(uuid.uuid4())

            (
                self.supabase.table("chat_sessions")
                .insert(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "title": title,
                    }
                )
                .execute()
            )

            (
                self.supabase.table("chat_conversations")
                .insert(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "messages": [],
                    }
                )
                .execute()
            )

            return session_id

        except Exception as e:
            logger.error("Error creating session error=%s", str(e))
            raise

    async def get_session_list(
        self,
        user_id: str,
    ) -> list:
        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("user_id", user_id)
                .is_("deleted_at", "null")
                .order("updated_at", desc=True)
                .execute()
            )

            return [
                {
                    "id": row["session_id"],
                    "title": row["title"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in (response.data or [])
            ]

        except Exception as e:
            logger.error(
                "Error fetching session list user=%s error=%s",
                user_id,
                str(e),
            )
            return []

    async def update_session(
        self,
        session_id: str,
        title: str,
    ) -> None:
        try:
            (
                self.supabase.table("chat_sessions")
                .update(
                    {
                        "title": title,
                        "updated_at": self._now(),
                    }
                )
                .eq("session_id", session_id)
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error updating session=%s error=%s",
                session_id,
                str(e),
            )
            raise

    async def delete_session(
        self,
        user_id: str,
        session_id: str,
    ) -> None:
        try:
            (
                self.supabase.table("chat_sessions")
                .update({"deleted_at": self._now()})
                .eq("session_id", session_id)
                .eq("user_id", user_id)
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error deleting session=%s error=%s",
                session_id,
                str(e),
            )
            raise

    async def get_context_window(
        self,
        session_id: str,
        window_size: int,
    ) -> list:
        messages = await self.get_messages(
            session_id=session_id,
            limit=window_size,
        )
        return messages or []

    async def save_attachment(
        self,
        session_id: str,
        storage_path: str,
        file_name: str,
        mime_type: str | None,
        file_size: int | None,
        extracted_text: str | None = None,
    ) -> str:
        try:
            attachment_id = str(uuid.uuid4())

            (
                self.supabase.table("chat_attachments")
                .insert(
                    {
                        "attachment_id": attachment_id,
                        "session_id": session_id,
                        "storage_path": storage_path,
                        "file_name": file_name,
                        "mime_type": mime_type,
                        "file_size": file_size,
                        "extracted_text": extracted_text,
                    }
                )
                .execute()
            )

            return attachment_id

        except Exception as e:
            logger.error(
                "Error saving attachment session=%s error=%s",
                session_id,
                str(e),
            )
            raise

    async def get_attachments(
        self,
        session_id: str,
    ) -> list:
        try:
            response = (
                self.supabase.table("chat_attachments")
                .select("*")
                .eq("session_id", session_id)
                .is_("deleted_at", "null")
                .order("created_at", desc=False)
                .execute()
            )

            return response.data or []

        except Exception as e:
            logger.error(
                "Error fetching attachments session=%s error=%s",
                session_id,
                str(e),
            )
            return []
import uuid
import logging
from datetime import datetime, UTC
from typing import Optional

from app.domain.interfaces.memory_repository import (
    IMemoryRepository,
)

from app.infra.clients.supabase_client import (
    SupabaseClient,
)

logger = logging.getLogger(__name__)


class SupabaseMemoryRepository(IMemoryRepository):
    def __init__(
        self,
        supabase_client: Optional[SupabaseClient] = None,
    ):
        self.client = supabase_client or SupabaseClient()
        self.supabase = self.client.admin

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
                .single()
                .execute()
            )

            if not response.data:
                return []

            messages = response.data.get(
                "messages",
                [],
            )

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
                .single()
                .execute()
            )

            if not session_response.data:
                raise Exception("Session not found")

            user_id = session_response.data["user_id"]

            payload = {
                "session_id": session_id,
                "user_id": user_id,
                "messages": messages,
                "updated_at": datetime.now(UTC).isoformat(),
            }

            (
                self.supabase.table("chat_conversations")
                .update(
                    payload,
                    on_conflict="session_id",
                )
                .eq("session_id", session_id)
                .execute()
            )

            (
                self.supabase.table("chat_sessions")
                .update({"updated_at": datetime.now(UTC).isoformat()})
                .eq(
                    "session_id",
                    session_id,
                )
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error saving messages session=%s error=%s",
                session_id,
                str(e),
            )

    async def get_session(
        self,
        session_id: str,
    ) -> dict | None:

        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq(
                    "session_id",
                    session_id,
                )
                .is_(
                    "deleted_at",
                    "null",
                )
                .single()
                .execute()
            )

            return response.data

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
            logger.error(
                "Error creating session error=%s",
                str(e),
            )

            raise

    async def get_session_list(
        self,
        user_id: str,
    ) -> list:

        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq(
                    "user_id",
                    user_id,
                )
                .is_(
                    "deleted_at",
                    "null",
                )
                .order(
                    "updated_at",
                    desc=True,
                )
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
                        "updated_at": datetime.now(UTC).isoformat(),
                    }
                )
                .eq(
                    "session_id",
                    session_id,
                )
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error updating session=%s error=%s",
                session_id,
                str(e),
            )

    async def delete_session(
        self,
        user_id: str,
        session_id: str,
    ) -> None:

        try:
            (
                self.supabase.table("chat_sessions")
                .update(
                    {
                        "deleted_at": datetime.now(UTC).isoformat(),
                    }
                )
                .eq(
                    "session_id",
                    session_id,
                )
                .eq(
                    "user_id",
                    user_id,
                )
                .execute()
            )

        except Exception as e:
            logger.error(
                "Error deleting session=%s error=%s",
                session_id,
                str(e),
            )

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

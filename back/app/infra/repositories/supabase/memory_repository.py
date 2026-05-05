import uuid
import logging
from datetime import datetime
from typing import Optional
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SupabaseMemoryRepository(IMemoryRepository):
    def __init__(self, supabase_client: Optional[SupabaseClient] = None):
        self.client = supabase_client or SupabaseClient()
        self.supabase = self.client.get_client(admin=True)

    async def get_messages(self, session_id: str, limit: int = 50) -> list | None:
        try:
            response = (
                self.supabase.table("chat_messages")
                .select("*")
                .eq("session_id", session_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            if not response.data:
                return None

            return [row for row in reversed(response.data)]
        except Exception as e:
            logger.error(f"Error fetching messages for session {session_id}: {e}")
            return None

    async def save_messages(self, session_id: str, messages: list) -> None:
        try:
            self.supabase.table("chat_messages").delete().eq("session_id", session_id).execute()

            if not messages:
                return

            msg_data = []
            for msg in messages:
                msg_data.append({
                    "id": msg.get("id", str(uuid.uuid4())),
                    "session_id": session_id,
                    "role": msg.get("role"),
                    "content": msg.get("content"),
                    "timestamp": msg.get("timestamp"),
                    "attachments": msg.get("attachments", []),
                    "artifacts": msg.get("artifacts", []),
                })

            self.supabase.table("chat_messages").insert(msg_data).execute()
        except Exception as e:
            logger.error(f"Error saving messages for session {session_id}: {e}")

    async def get_session(self, session_id: str) -> dict | None:
        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("id", session_id)
                .single()
                .execute()
            )

            if not response.data:
                return None

            return dict(response.data)
        except Exception as e:
            logger.error(f"Error fetching session {session_id}: {e}")
            return None

    async def create_session(self, user_id: str, title: str) -> str:
        session_id = str(uuid.uuid4())
        try:
            self.supabase.table("chat_sessions").insert({
                "id": session_id,
                "user_id": user_id,
                "title": title,
                "model_used": "default"
            }).execute()
            return session_id
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise

    async def get_session_list(self, user_id: str) -> list:
        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return [dict(row) for row in (response.data or [])]
        except Exception as e:
            logger.error(f"Error fetching sessions for user {user_id}: {e}")
            return []

    async def update_session(self, session_id: str, title: str) -> None:
        try:
            self.supabase.table("chat_sessions").update({
                "title": title,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.error(f"Error updating session {session_id}: {e}")

    async def delete_session(self, user_id: str, session_id: str) -> None:
        try:
            self.supabase.table("chat_sessions").delete().eq("id", session_id).execute()
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")

    async def get_context_window(self, session_id: str, window_size: int) -> list:
        messages = await self.get_messages(session_id, window_size)
        return messages or []
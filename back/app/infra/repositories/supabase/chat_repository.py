from typing import Optional, List
from app.domain.interfaces.chat_repository import IChatRepository
from app.domain.entities.chat_session import ChatSession
from app.domain.entities.message import Message
from app.infra.clients.supabase_client import SupabaseClient


class SupabaseChatRepository(IChatRepository):
    def __init__(self, supabase_client: Optional[SupabaseClient] = None):
        self.client = supabase_client or SupabaseClient()
        self.supabase = self.client.get_client(admin=False)

    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Retrieve a complete chat session"""
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
            
            return ChatSession(**response.data)
        except Exception as e:
            print(f"Error fetching session {session_id}: {e}")
            return None

    async def save_session(self, session: ChatSession) -> None:
        """Save or update a chat session"""
        try:
            self.supabase.table("chat_sessions").upsert(
                session.model_dump()
            ).execute()
        except Exception as e:
            print(f"Error saving session: {e}")

    async def create_session(self, user_id: str, title: str) -> str:
        """Create a new session"""
        try:
            response = (
                self.supabase.table("chat_sessions")
                .insert({
                    "user_id": user_id,
                    "title": title,
                    "model_used": "default"
                })
                .execute()
            )
            return response.data[0]["id"]
        except Exception as e:
            print(f"Error creating session: {e}")
            raise

    async def get_user_sessions(self, user_id: str, limit: int = 50) -> list:
        """Get all sessions for a user"""
        try:
            response = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            print(f"Error fetching user sessions: {e}")
            return []

    async def delete_session(self, session_id: str) -> None:
        """Delete a complete session (cascades to messages)"""
        try:
            self.supabase.table("chat_sessions").delete().eq(
                "id", session_id
            ).execute()
        except Exception as e:
            print(f"Error deleting session: {e}")

    async def add_message(self, session_id: str, message: Message) -> None:
        """Append a message to a session"""
        try:
            self.supabase.table("chat_messages").insert(
                message.model_dump()
            ).execute()
        except Exception as e:
            print(f"Error adding message: {e}")

    async def get_messages(self, session_id: str, limit: int = 50) -> Optional[list]:
        """Get recent messages from a session"""
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
            
            # Reverse to get chronological order
            return [Message(**row) for row in reversed(response.data)]
        except Exception as e:
            print(f"Error fetching messages: {e}")
            return None

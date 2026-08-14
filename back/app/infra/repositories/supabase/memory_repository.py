import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from app.domain.interfaces.session_repository import ISessionRepository
from app.domain.interfaces.message_repository import IMessageRepository
from app.domain.interfaces.attachment_repository import IAttachmentRepository
from app.domain.interfaces.ai_generated_files import IAIGeneratedFilesRepository
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)
UTC = timezone.utc


class SupabaseMemoryRepository(
    ISessionRepository,
    IMessageRepository,
    IAttachmentRepository,
    IAIGeneratedFilesRepository,
):
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
    limit: int = 20,
    cursor_updated_at: str | None = None,
    cursor_id: str | None = None,
) -> dict:
        empty = {
            "sessions": [],
            "has_more": False,
            "next_cursor_updated_at": None,
            "next_cursor_id": None,
        }
        try:
            query = (
                self.supabase.table("chat_sessions")
                .select("*")
                .eq("user_id", user_id)
                .is_("deleted_at", "null")
            )

            if cursor_updated_at and cursor_id:
                query = query.or_(
                    f"updated_at.lt.{cursor_updated_at},"
                    f"and(updated_at.eq.{cursor_updated_at},session_id.lt.{cursor_id})"
                )

            response = (
                query.order("updated_at", desc=True)
                .order("session_id", desc=True)
                .limit(limit + 1)
                .execute()
            )

            rows = response.data or []
            has_more = len(rows) > limit
            rows = rows[:limit]

            sessions = [
                {
                    "id": row["session_id"],
                    "title": row["title"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]

            return {
                "sessions": sessions,
                "has_more": has_more,
                "next_cursor_updated_at": rows[-1]["updated_at"] if has_more and rows else None,
                "next_cursor_id": rows[-1]["session_id"] if has_more and rows else None,
            }

        except Exception as e:
            logger.error(
                "Error fetching session list user=%s error=%s",
                user_id,
                str(e),
            )
            return empty
        
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

    # ai generated files operations
    async def save_ai_file(
        self,
        session_id: str,
        user_id: str,
        file_type: str,
        storage_path: str,
        file_name: str,
        metadata: dict | None = None,
        expires_at: str | None = None,
    ) -> str:
        try:
            file_id = str(uuid.uuid4())

            (
                self.supabase.table("ai_generated_files")
                .insert(
                    {
                        "file_id": file_id,
                        "session_id": session_id,
                        "user_id": user_id,
                        "file_type": file_type,
                        "storage_path": storage_path,
                        "file_name": file_name,
                        "metadata": metadata,
                        "expires_at": expires_at,
                    }
                )
                .execute()
            )

            return file_id

        except Exception as e:
            logger.error(
                "Error saving AI generated file session=%s error=%s",
                session_id,
                str(e),
            )
            raise

    async def get_ai_files(
        self,
        session_id: str,
        file_type: str | None = None,
    ) -> list:
        try:
            query = (
                self.supabase.table("ai_generated_files")
                .select("*")
                .eq("session_id", session_id)
                .is_("deleted_at", "null")
            )

            if file_type:
                query = query.eq("file_type", file_type)

            response = query.order("created_at", desc=False).execute()

            return response.data or []

        except Exception as e:
            logger.error(
                "Error fetching AI generated files session=%s error=%s",
                session_id,
                str(e),
            )
            return []

    async def get_ai_file_by_id(
        self,
        file_id: str,
    ) -> Optional[dict]:
        """Retrieve an AI-generated file by ID from Supabase."""
        try:
            response = (
                self.supabase.table("ai_generated_files")
                .select("*")
                .eq("file_id", file_id)
                .is_("deleted_at", "null")
                .maybe_single()
                .execute()
            )
            return response.data if response else None

        except Exception as e:
            logger.error(
                "Error fetching AI generated file file_id=%s error=%s",
                file_id,
                str(e),
            )
            return None

    async def soft_delete_ai_file(
        self,
        file_id: str,
        user_id: str,
    ) -> bool:
        """Soft delete an AI-generated file by marking it with a deleted_at timestamp."""
        try:
            # First verify the file belongs to the user
            response = (
                self.supabase.table("ai_generated_files")
                .select("file_id")
                .eq("file_id", file_id)
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )

            if not response or not response.data:
                logger.warning(
                    "AI file not found or does not belong to user file_id=%s user_id=%s",
                    file_id,
                    user_id,
                )
                return False

            # Soft delete by updating deleted_at timestamp
            (
                self.supabase.table("ai_generated_files")
                .update({"deleted_at": self._now()})
                .eq("file_id", file_id)
                .eq("user_id", user_id)
                .execute()
            )

            return True

        except Exception as e:
            logger.error(
                "Error soft deleting AI file file_id=%s user_id=%s error=%s",
                file_id,
                user_id,
                str(e),
            )
            return False

    async def create_voice_call(
        self,
        user_id: str,
        session_id: str | None,
        title: str,
        call_id: str | None = None,
    ) -> str:
        try:
            call_id = call_id or str(uuid.uuid4())
            payload = {
                "id": call_id,
                "user_id": user_id,
                "session_id": session_id,
                "title": title,
                "status": "active",
                "created_at": self._now(),
                "updated_at": self._now(),
            }
            self.supabase.table("voice_calls").insert(payload).execute()
            return call_id
        except Exception as e:
            logger.exception("Error creating voice call user_id=%s", user_id)
            raise

    async def get_voice_call(self, call_id: str) -> dict | None:
        try:
            response = (
                self.supabase.table("voice_calls")
                .select("*")
                .eq("id", call_id)
                .maybe_single()
                .execute()
            )
            return response.data if response and hasattr(response, "data") else None
        except Exception as e:
            logger.exception("Error fetching voice call=%s", call_id)
            return None

    async def save_voice_message(
        self,
        call_id: str,
        session_id: str | None,
        role: str,
        content: str | None = None,
        audio_path: str | None = None,
        transcript: str | None = None,
        transcript_json: dict | None = None,
        seq: int | None = None,
        is_final: bool = False,
        metadata: dict | None = None,
    ) -> str:
        try:
            message_id = str(uuid.uuid4())
            payload = {
                "id": message_id,
                "call_id": call_id,
                "session_id": session_id,
                "role": role,
                "audio_path": audio_path,
                "transcript": transcript or content,
                "transcript_json": transcript_json or metadata or None,
                "seq": seq or 0,
                "is_final": is_final,
                "metadata": metadata,
                "created_at": self._now(),
            }
            self.supabase.table("voice_call_messages").insert(payload).execute()
            return message_id
        except Exception as e:
            logger.exception("Error saving voice message for call=%s", call_id)
            raise

    async def load_voice_history(self, call_id: str) -> list:
        try:
            response = (
                self.supabase.table("voice_call_messages")
                .select("*")
                .eq("call_id", call_id)
                .order("created_at", desc=False)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.exception("Error loading voice history call=%s", call_id)
            return []

    async def finish_voice_call(self, call_id: str) -> None:
        try:
            call = await self.get_voice_call(call_id)
            if not call:
                return
            started = call.get("started_at")
            duration = None
            if started:
                try:
                    started_dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
                    duration = int((datetime.now(timezone.utc) - started_dt).total_seconds())
                except Exception:
                    duration = None

            update = {
                "ended_at": self._now(),
                "status": "finished",
                "updated_at": self._now(),
            }
            if duration is not None:
                update["duration_seconds"] = duration

            self.supabase.table("voice_calls").update(update).eq("id", call_id).execute()
        except Exception as e:
            logger.exception("Error finishing voice call=%s", call_id)
            raise

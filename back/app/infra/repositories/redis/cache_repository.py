import json
import uuid
from datetime import datetime, UTC

from redis.asyncio import Redis

from app.domain.interfaces.session_repository import ISessionRepository
from app.domain.interfaces.message_repository import IMessageRepository
from app.domain.interfaces.attachment_repository import IAttachmentRepository


class RedisCacheRepository(ISessionRepository, IMessageRepository, IAttachmentRepository):
    SESSION_TTL = 14400  # 4h

    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    @staticmethod
    def _messages_key(session_id: str) -> str:
        return f"chat:{session_id}:messages"

    @staticmethod
    def _meta_key(session_id: str) -> str:
        return f"chat:{session_id}:meta"

    @staticmethod
    def _user_sessions_key(user_id: str) -> str:
        return f"chat:{user_id}:sessions"

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()

    async def save_messages(
        self,
        session_id: str,
        messages: list,
    ) -> None:
        key = self._messages_key(session_id)

        async with self.redis.pipeline() as pipe:
            pipe.delete(key)

            if messages:
                pipe.rpush(key, *[json.dumps(m) for m in messages])

            pipe.expire(key, self.SESSION_TTL)
            await pipe.execute()

    async def get_messages(
        self,
        session_id: str,
        limit: int = 50,
    ) -> list | None:
        key = self._messages_key(session_id)
        messages = await self.redis.lrange(key, -limit, -1)

        if not messages:
            return None

        return [json.loads(m) for m in messages]

    async def get_context_window(
        self,
        session_id: str,
        window_size: int,
    ) -> list:
        messages = await self.get_messages(session_id, window_size)
        return messages or []

    async def create_session(
        self,
        user_id: str,
        title: str,
        session_id: str | None = None,
    ) -> str:
        session_id = session_id or str(uuid.uuid4())
        now = self._now()

        meta_key = self._meta_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        async with self.redis.pipeline() as pipe:
            pipe.hset(
                meta_key,
                mapping={
                    "id": session_id,
                    "title": title,
                    "created_at": now,
                    "updated_at": now,
                    "user_id": user_id,
                },
            )
            pipe.sadd(user_sessions_key, session_id)
            pipe.expire(meta_key, self.SESSION_TTL)
            pipe.expire(user_sessions_key, self.SESSION_TTL)
            await pipe.execute()

        return session_id

    async def get_session(
        self,
        session_id: str,
    ) -> dict | None:
        key = self._meta_key(session_id)
        data = await self.redis.hgetall(key)
        return data or None

    async def get_session_list(
        self,
        user_id: str,
    ) -> list:
        key = self._user_sessions_key(user_id)
        session_ids = await self.redis.smembers(key)

        if not session_ids:
            return []

        async with self.redis.pipeline() as pipe:
            for sid in session_ids:
                pipe.hgetall(self._meta_key(sid))
            results = await pipe.execute()

        return [data for data in results if data]

    async def update_session(
        self,
        session_id: str,
        title: str,
    ) -> None:
        key = self._meta_key(session_id)

        async with self.redis.pipeline() as pipe:
            pipe.hset(
                key,
                mapping={
                    "title": title,
                    "updated_at": self._now(),
                },
            )
            pipe.expire(key, self.SESSION_TTL)
            await pipe.execute()

    async def delete_session(
        self,
        user_id: str,
        session_id: str,
    ) -> None:
        meta_key = self._meta_key(session_id)
        messages_key = self._messages_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        async with self.redis.pipeline() as pipe:
            pipe.delete(meta_key)
            pipe.delete(messages_key)
            pipe.srem(user_sessions_key, session_id)
            await pipe.execute()

    async def save_attachment(
        self,
        session_id: str,
        storage_path: str,
        file_name: str,
        mime_type: str | None,
        file_size: int | None,
        extracted_text: str | None = None,
    ) -> str:
        attachment_id = str(uuid.uuid4())

        key = f"chat:{session_id}:attachments:{attachment_id}"

        data = {
            "id": attachment_id,
            "storage_path": storage_path,
            "file_name": file_name,
            "mime_type": mime_type or "",
            "file_size": file_size or 0,
            "extracted_text": extracted_text or "",
            "created_at": self._now(),
        }

        async with self.redis.pipeline() as pipe:
            pipe.hset(key, mapping=data)
            pipe.expire(key, self.SESSION_TTL)
            await pipe.execute()

        return attachment_id

    async def get_attachments(
        self,
        session_id: str,
    ) -> list:
        # Cache is not source of truth for attachments, return empty list
        return []

    # Redis Stream Management
    async def start_stream(self, session_id: str) -> None:
        key = f"stream:{session_id}:stopped"
        await self.redis.set(key, "0", ex=300)

    async def stop_stream(self, session_id: str) -> bool:
        key = f"stream:{session_id}:stopped"
        exists = await self.redis.exists(key)
        if exists:
            await self.redis.set(key, "1", ex=300)
            return True
        return False

    async def should_stop_stream(self, session_id: str) -> bool:
        key = f"stream:{session_id}:stopped"
        val = await self.redis.get(key)
        if isinstance(val, bytes):
            val = val.decode("utf-8")
        return val == "1"

    async def cleanup_stream(self, session_id: str) -> None:
        key = f"stream:{session_id}:stopped"
        await self.redis.delete(key)

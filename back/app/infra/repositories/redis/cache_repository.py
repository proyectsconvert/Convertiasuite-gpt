import json
from pyexpat.errors import messages
import uuid
from datetime import datetime
from redis.asyncio import Redis
from app.domain.interfaces.memory_repository import IMemoryRepository


class RedisCacheRepository(IMemoryRepository):
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.ttl = 14400  

    def _messages_key(self, session_id: str) -> str:
        return f"chat:{session_id}:messages"

    def _meta_key(self, session_id: str) -> str:
        return f"chat:{session_id}:meta"

    def _user_sessions_key(self, user_id: str) -> str:
        return f"chat:{user_id}:sessions"

    # ===== Message Operations =====

    async def save_messages(self, session_id: str, messages: list) -> None:
        key = self._messages_key(session_id)
        
        await self.redis.delete(key)
        
        for message in messages:
            await self.redis.rpush(key, json.dumps(message))
        
        await self.redis.expire(key, self.ttl)

    async def get_messages(self, session_id: str, limit: int = 50) -> list | None:
        key = self._messages_key(session_id)
        
        messages = await self.redis.lrange(key, -limit, -1)
        
        if not messages:
            return None
        
        return [json.loads(m) for m in messages]

    async def get_context_window(self, session_id: str, window_size: int) -> list:
        messages = await self.get_messages(session_id, window_size)
        return messages or []


    async def create_session(self, user_id: str, title: str) -> None:
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        meta_key = self._meta_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        async with self.redis.pipeline() as pipe:
            pipe.hset(meta_key, mapping={
                "id": session_id,
                "title": title,
                "created_at": now,
                "updated_at": now,
                "user_id": user_id
            })

            pipe.sadd(user_sessions_key, session_id)

            pipe.expire(meta_key, self.ttl)
            pipe.expire(user_sessions_key, self.ttl)

            await pipe.execute()

        return session_id

    async def get_session(self, session_id: str) -> dict | None:
        key = self._meta_key(session_id)
        data = await self.redis.hgetall(key)

        if not data:
            return None

        return {k.decode(): v.decode() for k, v in data.items()}

    async def get_session_list(self, user_id: str) -> list:
        key = self._user_sessions_key(user_id)
        session_ids = await self.redis.smembers(key)

        sessions = []
        for sid in session_ids:
            session = await self.get_session(sid.decode())
            if session:
                sessions.append(session)

        return sessions

    async def update_session(self, session_id: str, title: str) -> None:
        key = self._meta_key(session_id)

        await self.redis.hset(key, "updated_at", datetime.utcnow().isoformat())
        await self.redis.hset(key, "title", title)
        await self.redis.expire(key, self.ttl)

    async def delete_session(self, user_id: str, session_id: str) -> None:
        meta_key = self._meta_key(session_id)
        messages_key = self._messages_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        async with self.redis.pipeline() as pipe:
            pipe.delete(meta_key)
            pipe.delete(messages_key)
            pipe.srem(user_sessions_key, session_id)
            await pipe.execute()

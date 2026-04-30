import redis.asyncio as redis
from redis import Redis
import json
import uuid
from datetime import datetime

from app.core.config import get_settings


class RedisMemory:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.sessions_key = "chat:sessions:{user_id}"
        self.chat_prefix = "chat:messages:"

    async def get(self, key: str) -> list:
        value = await self.redis.get(key)
        if value is not None:
            return json.loads(value)
        return None
    
    async def get_messages(self, session_id: str) -> list:
        key = self.chat_prefix + session_id
        value = await self.redis.get(key)
        return json.loads(value) if value else []
    
    async def save_messages(self, session_id: str, messages: list) -> None:
        key = self.chat_prefix + session_id
        await self.redis.set(key, json.dumps(messages))

    async def delete_messages(self, session_id: str) -> None:
        key = self.chat_prefix + session_id
        await self.redis.delete(key)
# sesiones
    async def set(self, key: str, value: list) -> None:
        await self.redis.set(key, json.dumps(value))

    async def delete(self, key: str) -> None:
        await self.redis.delete(key)

    async def get_session_list(self, user_id: str) -> list:
        key = self.sessions_key.format(user_id=user_id)
        sessions = await self.redis.lrange(key, 0 ,-1)
        return [json.loads(s) for s in sessions] if sessions else []

    async def create_session(self, user_id: str, title: str) -> str:
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        key = self.sessions_key.format(user_id=user_id)
        await self.redis.lpush(key, json.dumps(session_data))
        return session_id

    async def update_session(self, user_id: str, session_id: str) -> None:
        sessions = await self.get_session_list(user_id)
        for s in sessions:
            if s["id"] == session_id:
                s["updated_at"] = datetime.now().isoformat()
                break
        key = self.sessions_key.format(user_id=user_id)
        await self.redis.delete(key)
        for s in sessions:
            await self.redis.rpush(key, json.dumps(s))

    async def delete_session(self, user_id: str, session_id: str) -> None:
        key = self.sessions_key.format(user_id=user_id)
        sessions = await self.get_session_list(user_id)
        sessions = [s for s in sessions if s["id"] != session_id]
        await self.redis.delete(key)
        for s in sessions:
            await self.redis.rpush(key, json.dumps(s))
        await self.redis.delete(f"chat:messages:{session_id}")
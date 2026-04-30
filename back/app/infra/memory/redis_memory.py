import json
import uuid
from datetime import datetime
from redis.asyncio import Redis

class RedisMemory:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.sessions_key = "chat:sessions:{user_id}"
        self.chat_prefix = "chat:messages:"
        self.ttl = 14400 

    async def get_messages(self, session_id: str) -> list:
        key = f"{self.chat_prefix}{session_id}"
        value = await self.redis.get(key)
        return json.loads(value) if value else []
    
    async def save_messages(self, session_id: str, messages: list) -> None:
        key = f"{self.chat_prefix}{session_id}"
        # Seteamos el valor y el TTL en una sola operación atómica
        await self.redis.set(key, json.dumps(messages), ex=self.ttl)

    async def get_context_window(self, session_id: str, window_size: int) -> list:
        messages = await self.get_messages(session_id)
        if not messages:
            return []
        return messages[-window_size:]

    async def get_session_list(self, user_id: str) -> list:
        key = self.sessions_key.format(user_id=user_id)
        sessions = await self.redis.lrange(key, 0, -1)
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
        
        async with self.redis.pipeline() as pipe:
            pipe.lpush(key, json.dumps(session_data))
            pipe.expire(key, self.ttl)
            await pipe.execute()
            
        return session_id

    async def update_session(self, user_id: str, session_id: str) -> None:
        key = self.sessions_key.format(user_id=user_id)
        sessions = await self.get_session_list(user_id)
        
        for s in sessions:
            if s["id"] == session_id:
                s["updated_at"] = datetime.now().isoformat()
                break
        
        async with self.redis.pipeline() as pipe:
            pipe.delete(key)
            for s in sessions:
                pipe.rpush(key, json.dumps(s))
            pipe.expire(key, self.ttl)
            await pipe.execute()

    async def delete_session(self, user_id: str, session_id: str) -> None:
        key = self.sessions_key.format(user_id=user_id)
        sessions = await self.get_session_list(user_id)
        
        filtered_sessions = [s for s in sessions if s["id"] != session_id]
        
        async with self.redis.pipeline() as pipe:
            pipe.delete(key)
            for s in filtered_sessions:
                pipe.rpush(key, json.dumps(s))
            pipe.delete(f"{self.chat_prefix}{session_id}")
            pipe.expire(key, self.ttl)
            await pipe.execute()
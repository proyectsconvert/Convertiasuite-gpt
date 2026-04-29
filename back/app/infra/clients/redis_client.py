from typing import Optional
import redis.asyncio as redis
from redis.asyncio import Redis

_redis_instance:[Optional[Redis]] = None
async def get_redis_client(redis_url: str) -> Redis:
    global _redis_instance

    if _redis_instance is None:
        _redis_instance = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
        )

    return _redis_instance
async def close_redis_client() -> None:
    global _redis_instance 
    if _redis_instance is not None:
        await _redis_instance.close()
        _redis_instance = None
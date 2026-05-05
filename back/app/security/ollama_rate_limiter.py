import time
from collections import defaultdict
from dataclasses import dataclass, field
import asyncio
import logging

logger = logging.getLogger(__name__)

@dataclass
class SlidingWindowRateLimiter:
    max_requests: int
    window_seconds: int
    _requests: dict = field(default_factory=lambda: defaultdict(list))
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def acquire(self, key: str = "default") -> bool:
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds

            self._requests[key] = [
                ts for ts in self._requests[key]
                if ts > window_start
            ]

            if len(self._requests[key]) >= self.max_requests:
                sleep_time = self._requests[key][0] + self.window_seconds - now
                if sleep_time > 0:
                    logger.warning(f"Rate limit reached for {key}, sleeping {sleep_time:.2f}s")
                    await asyncio.sleep(sleep_time)
                    self._requests[key] = [
                        ts for ts in self._requests[key]
                        if ts > time.time() - self.window_seconds
                    ]

            if len(self._requests[key]) < self.max_requests:
                self._requests[key].append(time.time())
                return True

            return False

    async def wait_and_acquire(self, key: str = "default", max_retries: int = 5) -> bool:
        for _ in range(max_retries):
            if await self.acquire(key):
                return True
            await asyncio.sleep(1)
        return False


ollama_rate_limiter = SlidingWindowRateLimiter(
    max_requests=30,
    window_seconds=60,
)
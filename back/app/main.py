from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from slowapi.errors import RateLimitExceeded

from app.core.config import Settings, get_settings
from app.infra.clients.redis_client import (
    get_redis_client,
    close_redis_client
)

from app.infra.repositories.composite_memory_repository import (
    CompositeMemoryRepository
)

from app.infra.repositories.redis.cache_repository import (
    RedisCacheRepository
)

from app.infra.repositories.supabase.memory_repository import (
    SupabaseMemoryRepository
)

from app.security.rate_limiting import limiter
from app.api import chat, auth


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("performance")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    client = await get_redis_client(settings.redis_url)

    app.state.cache = RedisCacheRepository(client)

    app.state.supabase = SupabaseMemoryRepository()

    app.state.memory = CompositeMemoryRepository(
        cache=app.state.cache,
        db=app.state.supabase
    )

    logger.info("Application startup completed")

    yield

    await close_redis_client()

    logger.info("Application shutdown completed")





app = FastAPI(
    title="ConvertiaSuite-GPT",
    version="1.0",
    lifespan=lifespan,
)





app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: {"detail": "Rate limit exceeded"}
)





@app.middleware("http")
async def measure_requests(request: Request, call_next):
    start_time = time.perf_counter()

    response = await call_next(request)

    duration = time.perf_counter() - start_time

    logger.info(
        f"{request.method} "
        f"{request.url.path} "
        f"status={response.status_code} "
        f"duration={duration:.3f}s"
    )

    return response





app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8083",
        "http://127.0.0.1:8083",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://10.130.30.40:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





app.include_router(auth.router)
app.include_router(chat.router)
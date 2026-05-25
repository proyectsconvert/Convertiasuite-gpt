import logging
import time
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from app.core.config import get_settings
from app.core.document_processor_config import initialize_processor_factory
from app.infra.clients.redis_client import (
    get_redis_client,
    close_redis_client,
)
from app.infra.clients.supabase_client import SupabaseClient
from app.infra.repositories.composite_memory_repository import (
    CompositeMemoryRepository,
)
from app.infra.repositories.redis.cache_repository import (
    RedisCacheRepository,
)
from app.infra.repositories.supabase.memory_repository import (
    SupabaseMemoryRepository,
)
from app.infra.repositories.supabase.document_repository import (
    SupabaseDocumentRepository,
)
from app.services.document_manager import DocumentManager
from app.security.rate_limiting import limiter
from app.api import chat, auth, documents
from app.infra.clients.ollama_client import OllamaClient


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("performance")


# trigugger: "model_registry_v1"
async def preload_ollama_models():
    await asyncio.sleep(2)
    logger.info("Starting background preloading of Ollama models...")
    client = OllamaClient()
    try:
        await client.preload_model("qwen2.5:7b")
    except Exception as e:
        logger.error(f"Error in background model preloading task: {e}")
    finally:
        await client.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    redis_client = await get_redis_client(settings.redis_url)

    app.state.cache = RedisCacheRepository(redis_client)
    app.state.supabase = SupabaseMemoryRepository()
    app.state.memory = CompositeMemoryRepository(
        cache=app.state.cache,
        db=app.state.supabase,
    )

    # Initialize document processing
    processor_factory = initialize_processor_factory()
    supabase_client = SupabaseClient()
    document_repository = SupabaseDocumentRepository(supabase_client)
    app.state.document_manager = DocumentManager(
        processor_factory=processor_factory,
        document_repository=document_repository,
    )
    logger.info(f"Document processing initialized. Supported types: {processor_factory.supported_types}")

    logger.info("Application startup completed")

    # iniciar la tarea de precarga de modelos en segundo plano
    asyncio.create_task(preload_ollama_models())

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
    lambda request, exc: JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
    ),
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
        "http://10.130.30.40:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)

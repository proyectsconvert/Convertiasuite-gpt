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
from app.infra.repositories.composite import CompositeMemoryRepository
from app.infra.repositories.redis.cache_repository import (
    RedisCacheRepository,
)
from app.infra.repositories.supabase.memory_repository import (
    SupabaseMemoryRepository,
)
from app.infra.repositories.supabase.document_repository import (
    SupabaseDocumentRepository,
)
from app.services.document_processing.document_manager import DocumentManager
from app.security.rate_limiting import limiter
from app.api import chat, auth, documents, admin
from app.infra.clients.ollama_client import OllamaClient
from app.infra.providers.ollama_provider import OllamaProvider
from app.services.intent_classifier import IntentClassifier
from app.rag.supabase_rag_repository import SupabaseRagRepository
from app.rag.embending import warmup_embed_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("performance")


async def preload_ollama_models():
    await asyncio.sleep(1)  # Pequeño delay para estabilidad
    logger.info("precalentando modelos de Ollama...")

    client = OllamaClient()
    models_to_preload = ["qwen2.5:7b"]

    try:
        for model in models_to_preload:
            logger.info(f"\n→ Precalentando {model}...")
            success = await client.preload_model(model, max_retries=5)

            if success:
                logger.info(f"✓ {model} está listo para consultas")
            else:
                logger.warning(
                    f"✗ No se pudo precalentar {model}, pero la app continuará. "
                    f"La primera consulta será lenta."
                )

        logger.info("\nPrecalentamiento de modelos completado")

    except Exception as e:
        logger.error(f"✗ Error en precalentamiento: {e}", exc_info=True)
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
    logger.info(
        f"Document processing initialized. Supported types: {processor_factory.supported_types}"
    )

    ollama_client = OllamaClient()
    app.state.llm_provider = OllamaProvider(ollama_client)

    app.state.intent_classifier = IntentClassifier(ollama_client)

    # Initialize RAG repository
    app.state.rag_repository = SupabaseRagRepository(supabase_client)
    logger.info("RAG repository initialized")

    logger.info("Application startup completed")

    asyncio.create_task(preload_ollama_models())
    asyncio.create_task(warmup_embed_client())

    yield

    await ollama_client.close()
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


@app.get("/health")
async def health_check(request: Request):

    results: dict = {}
    overall_healthy = True

    # ── 1. Ollama ──────────────────────────────────────────────────────────────
    ollama_ok = False
    model_names: list = []
    qwen_loaded = False
    try:
        client = OllamaClient()
        response = await client.client.get(f"{client.base_url}/api/tags")
        response.raise_for_status()
        models = response.json().get("models", [])
        model_names = [m.get("name") for m in models]
        qwen_loaded = any("qwen2.5:7b" in name for name in model_names)
        ollama_ok = True
        await client.close()
    except Exception as e:
        logger.error("Health check — Ollama failed: %s", e)

    results["ollama"] = {
        "status": "ok" if ollama_ok else "error",
        "models_available": model_names,
        "qwen_loaded": qwen_loaded,
    }
    if not ollama_ok:
        overall_healthy = False

    # ── 2. Redis ───────────────────────────────────────────────────────────────
    redis_ok = False
    try:
        redis_client = getattr(request.app.state, "cache", None)
        if redis_client and hasattr(redis_client, "redis"):
            pong = await redis_client.redis.ping()
            redis_ok = bool(pong)
        else:
            redis_ok = False
    except Exception as e:
        logger.error("Health check — Redis failed: %s", e)

    results["redis"] = {"status": "ok" if redis_ok else "error"}
    if not redis_ok:
        overall_healthy = False

    # ── 3. Supabase ────────────────────────────────────────────────────────────
    supabase_ok = False
    try:
        supabase_client = SupabaseClient()
        # Query trivial — busca 1 fila de chat_sessions para verificar la conexión
        await asyncio.to_thread(
            lambda: supabase_client.db.table("chat_sessions")
            .select("session_id")
            .limit(1)
            .execute()
        )
        supabase_ok = True
    except Exception as e:
        logger.error("Health check — Supabase failed: %s", e)

    results["supabase"] = {"status": "ok" if supabase_ok else "error"}
    if not supabase_ok:
        overall_healthy = False

    # ── Respuesta global ───────────────────────────────────────────────────────
    if overall_healthy:
        global_status = "healthy"
        message = "Sistema listo para consultas" if qwen_loaded else "Sistema operativo — modelo cargándose"
    else:
        # Degradado si Ollama falla pero BD y cache están bien
        if redis_ok and supabase_ok:
            global_status = "degraded"
            message = "Sistema degradado — Ollama no disponible"
        else:
            global_status = "unhealthy"
            message = "Sistema no disponible — infraestructura crítica con errores"

    return {
        "status": global_status,
        "message": message,
        "services": results,
    }


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


settings_for_cors = get_settings()
cors_origins_list = [o.strip() for o in settings_for_cors.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(admin.router)


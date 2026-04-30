from contextlib import asynccontextmanager  # ← ojo, viene de contextlib, no de fastapi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.routers import chat
from app.core.config import Settings
from app.infra.clients.redis_client import get_redis_client, close_redis_client
from app.infra.memory.redis_memory import RedisMemory
from app.auth.router import router as auth_router
from app.security.rate_limiting import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = await get_redis_client(Settings().redis_url)
    app.state.memory = RedisMemory(client)
    yield
    await close_redis_client()


app = FastAPI(
    title="ConvertiaSuite-GPT",
    version="1.0",
    lifespan=lifespan,      
)

# Configurar el limiter en la app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: {"detail": "Too Many Requests"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://10.130.30.40:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(auth_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
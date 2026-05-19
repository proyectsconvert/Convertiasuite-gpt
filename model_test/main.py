from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import time
import statistics
import json
import datetime
from typing import Optional

app = FastAPI(title="LLM Benchmark API", version="1.0.0")

allow_origins=[
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://10.130.30.40:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
],
# CONFIGURACIÓN
OLLAMA_URL = "https://ollama.testbot.click"
TIMEOUT = 180

# MODELOS
DEFAULT_MODELS = [
    "gemma4-e4b:latest",
    "gemma4-e2b:latest",
    "gemma4:26b",
    "medgemma:4b",
    "deepseek-r1:latest",
    "deepseek-coder:latest",
    "glm-4.7-flash:latest",
    "nemotron-cascade-2:latest",
    "qwen3.6:latest",
    "qwen2.5:7b",
    "qwen2.5-coder:7b",
    "llama3.2-vision:11b",
]

# ENDPOINTS

@app.get("/health")
def health():
    """Verifica conexión con Ollama."""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
        models = [m["name"] for m in r.json().get("models", [])]
        return {"status": "ok", "ollama_url": OLLAMA_URL, "models_available": models}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama no disponible: {e}")


@app.get("/models")
def get_models():
    """Lista modelos disponibles en Ollama."""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
        return {"models": r.json().get("models", [])}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
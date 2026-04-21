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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ──────────────────────────────────────────────────────────
# PROMPTS
# ──────────────────────────────────────────────────────────
QUICK_PROMPTS = [
    {"id": "saludo", "text": "Hola, ¿cómo estás?", "category": "conversación"},
    {"id": "suma", "text": "¿Cuánto es 1 + 1?", "category": "matemáticas"},
    {"id": "division", "text": "¿Cuánto es 4 / 2?", "category": "matemáticas"},
    {"id": "multiplicacion", "text": "¿Cuánto es 2 * 8?", "category": "matemáticas"},
    {"id": "capital", "text": "¿Cuál es la capital de Francia? Responde solo con una palabra.", "category": "conocimiento"},
]

MEDIUM_PROMPTS = [
    {"id": "rest_vs_graphql", "text": "Explica la diferencia entre REST y GraphQL en 3 oraciones.", "category": "técnico"},
    {"id": "python_func", "text": "Escribe una función en Python que invierta una cadena de texto.", "category": "código"},
    {"id": "mundial_2023", "text": "¿Quién ganó el Mundial de Fútbol FIFA en 2023?", "category": "conocimiento"},
    {"id": "contexto", "text": "Me llamo Julieth y trabajo en Convertia. ¿Cómo me llamo y dónde trabajo?", "category": "contexto"},
    {"id": "precision", "text": "Dame SOLO los nombres de 3 lenguajes de programación. Nada más.", "category": "instrucción"},
]

HARD_PROMPTS = [
    {"id": "api_rest_full", "text": "Explica qué es una API REST. Luego explica qué es GraphQL. Finalmente, compáralos en detalle.", "category": "técnico"},
    {"id": "algoritmo", "text": "Implementa un algoritmo de ordenamiento bubble sort en Python con comentarios explicando cada paso.", "category": "código"},
    {"id": "filosofia", "text": "Explica el problema mente-cuerpo en filosofía y las principales posiciones al respecto.", "category": "razonamiento"},
    {"id": "sql_query", "text": "Escribe una query SQL para obtener los 5 clientes con más compras en el último mes, incluyendo su nombre, email y total gastado.", "category": "código"},
    {"id": "regex", "text": "Escribe una expresión regular para validar emails y explica cada parte.", "category": "técnico"},
]

ALL_PROMPTS = QUICK_PROMPTS + MEDIUM_PROMPTS + HARD_PROMPTS

# SCHEMAS

class BenchmarkRequest(BaseModel):
    models: list[str] = DEFAULT_MODELS
    prompt_ids: Optional[list[str]] = None  # None = todos
    n_runs: int = 1

class SingleRequest(BaseModel):
    model: str
    prompt: str

# HELPERS

def call_model(model: str, prompt: str) -> dict:
    """Llama al modelo y retorna métricas completas."""
    try:
        start_wall = time.time()
        
        # Medir TTFT con stream
        ttft = None
        first_token_time = None
        try:
            r_stream = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": True},
                timeout=TIMEOUT,
                stream=True
            )
            t_start = time.time()
            for line in r_stream.iter_lines():
                if line:
                    ttft = round(time.time() - t_start, 3)
                    break
        except:
            pass

        # Llamada completa sin stream
        start = time.time()
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=TIMEOUT
        )
        latency = round(time.time() - start, 3)

        if response.status_code != 200:
            return {"error": f"HTTP {response.status_code}", "latency": latency}

        data = response.json()
        
        prompt_eval_count = data.get("prompt_eval_count", 0)
        eval_count = data.get("eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 1)
        prompt_eval_duration_ns = data.get("prompt_eval_duration", 1)
        total_duration_ns = data.get("total_duration", 1)
        load_duration_ns = data.get("load_duration", 0)

        tokens_per_sec = round(eval_count / (eval_duration_ns / 1e9), 2) if eval_duration_ns else 0
        prompt_tokens_per_sec = round(prompt_eval_count / (prompt_eval_duration_ns / 1e9), 2) if prompt_eval_duration_ns else 0

        # RAM del modelo
        ram_info = get_ram_usage(model)

        return {
            "response": data.get("response", ""),
            "latency_s": latency,
            "ttft_s": ttft,
            "tokens_generated": eval_count,
            "prompt_tokens": prompt_eval_count,
            "total_tokens": eval_count + prompt_eval_count,
            "tokens_per_sec": tokens_per_sec,
            "prompt_tokens_per_sec": prompt_tokens_per_sec,
            "eval_duration_ms": round(eval_duration_ns / 1e6, 1),
            "prompt_eval_duration_ms": round(prompt_eval_duration_ns / 1e6, 1),
            "total_duration_ms": round(total_duration_ns / 1e6, 1),
            "load_duration_ms": round(load_duration_ns / 1e6, 1),
            "ram_mb": ram_info.get("ram_mb"),
            "vram_mb": ram_info.get("vram_mb"),
            "error": None
        }

    except requests.exceptions.Timeout:
        return {"error": "TIMEOUT", "latency_s": TIMEOUT}
    except Exception as e:
        return {"error": str(e), "latency_s": None}


def get_ram_usage(model: str) -> dict:
    try:
        response = requests.get(f"{OLLAMA_URL}/api/ps", timeout=10)
        data = response.json()
        for m in data.get("models", []):
            if model in m.get("name", ""):
                return {
                    "ram_mb": round(m.get("size", 0) / 1024 / 1024, 1),
                    "vram_mb": round(m.get("size_vram", 0) / 1024 / 1024, 1)
                }
    except:
        pass
    return {"ram_mb": None, "vram_mb": None}


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


@app.get("/prompts")
def get_prompts():
    """Retorna todos los prompts disponibles por categoría."""
    return {
        "quick": QUICK_PROMPTS,
        "medium": MEDIUM_PROMPTS,
        "hard": HARD_PROMPTS,
        "total": len(ALL_PROMPTS)
    }


@app.post("/benchmark/single")
def benchmark_single(req: SingleRequest):
    """Prueba un solo modelo con un prompt específico."""
    result = call_model(req.model, req.prompt)
    return {
        "model": req.model,
        "prompt": req.prompt,
        "timestamp": datetime.datetime.now().isoformat(),
        **result
    }


@app.post("/benchmark/run")
def run_benchmark(req: BenchmarkRequest):
    """
    Ejecuta benchmark completo.
    Retorna métricas por modelo y por prompt.
    """
    # Filtrar prompts si se especificaron IDs
    prompts = ALL_PROMPTS
    if req.prompt_ids:
        prompts = [p for p in ALL_PROMPTS if p["id"] in req.prompt_ids]

    results = []
    summary = {}

    for model in req.models:
        model_runs = []
        
        for prompt in prompts:
            prompt_runs = []
            
            for run in range(req.n_runs):
                result = call_model(model, prompt["text"])
                result["run"] = run + 1
                prompt_runs.append(result)
            
            # Promediar runs para este prompt
            valid_runs = [r for r in prompt_runs if not r.get("error")]
            
            if valid_runs:
                avg_result = {
                    "model": model,
                    "prompt_id": prompt["id"],
                    "prompt_text": prompt["text"],
                    "category": prompt["category"],
                    "n_runs": len(valid_runs),
                    "avg_latency_s": round(statistics.mean([r["latency_s"] for r in valid_runs]), 3),
                    "avg_ttft_s": round(statistics.mean([r["ttft_s"] for r in valid_runs if r.get("ttft_s")]), 3) if any(r.get("ttft_s") for r in valid_runs) else None,
                    "avg_tokens_per_sec": round(statistics.mean([r["tokens_per_sec"] for r in valid_runs]), 2),
                    "avg_tokens_generated": round(statistics.mean([r["tokens_generated"] for r in valid_runs])),
                    "avg_total_tokens": round(statistics.mean([r["total_tokens"] for r in valid_runs])),
                    "std_latency": round(statistics.pstdev([r["latency_s"] for r in valid_runs]), 3),
                    "ram_mb": valid_runs[-1].get("ram_mb"),
                    "vram_mb": valid_runs[-1].get("vram_mb"),
                    "response_preview": valid_runs[-1].get("response", "")[:300],
                    "errors": len(prompt_runs) - len(valid_runs),
                }
            else:
                avg_result = {
                    "model": model,
                    "prompt_id": prompt["id"],
                    "prompt_text": prompt["text"],
                    "category": prompt["category"],
                    "n_runs": 0,
                    "errors": len(prompt_runs),
                    "error": prompt_runs[0].get("error") if prompt_runs else "Unknown",
                }
            
            model_runs.append(avg_result)
            results.append(avg_result)

        # Summary por modelo
        valid_model = [r for r in model_runs if r.get("avg_latency_s") is not None]
        if valid_model:
            summary[model] = {
                "model": model,
                "total_prompts": len(prompts),
                "successful": len(valid_model),
                "errors": len(model_runs) - len(valid_model),
                "avg_latency_s": round(statistics.mean([r["avg_latency_s"] for r in valid_model]), 3),
                "avg_tokens_per_sec": round(statistics.mean([r["avg_tokens_per_sec"] for r in valid_model]), 2),
                "total_tokens_generated": sum(r.get("avg_tokens_generated", 0) for r in valid_model),
                "ram_mb": valid_model[-1].get("ram_mb"),
                "vram_mb": valid_model[-1].get("vram_mb"),
            }

    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "config": {
            "models": req.models,
            "prompts": len(prompts),
            "n_runs": req.n_runs,
            "ollama_url": OLLAMA_URL,
        },
        "summary": summary,
        "results": results,
    }


@app.get("/benchmark/stream")
async def stream_benchmark(models: str, prompt: str):
    """
    Stream de benchmark en tiempo real.
    models = comma-separated lista de modelos
    """
    model_list = models.split(",")

    async def generate():
        for model in model_list:
            yield f"data: {json.dumps({'type': 'start', 'model': model})}\n\n"
            result = call_model(model.strip(), prompt)
            yield f"data: {json.dumps({'type': 'result', 'model': model, **result})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
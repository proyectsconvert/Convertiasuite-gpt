from functools import lru_cache


MODELS = {
"default": {
        "model": "qwen2.5:7b",
        "temperature": 0.2,
        "num_ctx": 4096,
    },
    "code": {
        "model": "qwen2.5-coder:7b",
        "temperature": 0.3,
        "num_ctx": 2048,
    },
    "vision": {
        "model": "llama3.2-vision:11b",
        "temperature": 0.4,
        "num_ctx": 2048,
    },
    "analysis": {
        "model": "gemma4:26b",
        "temperature": 0.5,
        "num_ctx": 2048,
    },
    "reasoning": {
        "model": "deepseek-r1:latest",
        "temperature": 0.4,
        "num_ctx": 2048,
    },
    "ocr": {
        "model": "deepseek-ocr:latest",
        "temperature": 0.2,
        "num_ctx": 2048,
    },
    "medical": {
        "model": "medgemma:4b",
        "temperature": 0.3,
        "num_ctx": 2048,
    },
    "gemma-small": {
        "model": "gemma4-e2b:latest",
        "temperature": 0.2,
        "num_ctx": 1024,
    },
    "gemma-medium": {
        "model": "gemma4-e4b:latest",
        "temperature": 0.5,
        "num_ctx": 2048,
    },
}

DEFAULT_MODEL_KEY = "default"
ALLOWED_MODELS = list(MODELS.keys())


@lru_cache()
def get_model_config() -> dict:
    return MODELS

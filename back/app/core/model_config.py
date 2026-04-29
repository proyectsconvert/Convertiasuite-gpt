from functools import lru_cache


MODELS = {
    "default": {
        "model": "qwen2.5:7b",
        "temperature": 0.7,
        "num_ctx": 4096,
    },
    "code": {
        "model": "qwen2.5-coder:7b",
        "temperature": 0.3,
        "num_ctx": 8192,
    },
    "vision": {
        "model": "llama3.2-vision:11b",
        "temperature": 0.6,
        "num_ctx": 4096,
    },
    "analysis": {
        "model": "gemma4:26b",
        "temperature": 0.5,
        "num_ctx": 8192,
    },
    "reasoning": {
        "model": "deepseek-r1:latest",
        "temperature": 0.4,
        "num_ctx": 16384,
    },
    "ocr": {
        "model": "deepseek-ocr:latest",
        "temperature": 0.2,
        "num_ctx": 4096,
    },
    "medical": {
        "model": "medgemma:4b",
        "temperature": 0.3,
        "num_ctx": 8192,
    },
    "gemma-small": {
        "model": "gemma4-e2b:latest",
        "temperature": 0.6,
        "num_ctx": 4096,
    },
    "gemma-medium": {
        "model": "gemma4-e4b:latest",
        "temperature": 0.5,
        "num_ctx": 8192,
    },
}

DEFAULT_MODEL_KEY = "default"
ALLOWED_MODELS = list(MODELS.keys())


@lru_cache()
def get_model_config() -> dict:
    return MODELS
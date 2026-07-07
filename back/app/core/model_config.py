from functools import lru_cache

_FAST = "qwen3.5:4b"
_QUALITY = "qwen3.5:9b"
_VISION = "gemma4:e4b"       
_OCR = "glm-ocr"
_EMBED = "nomic-embed-text"

MODEL_REGISTRY = {

    "default":   {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "code":      {"model": _FAST, "tier": "hot", "keep_alive": "-1", "max_tokens": 2048},
    "landing":   {"model": _FAST, "tier": "hot", "keep_alive": "-1", "max_tokens": 2048},
    "design":    {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "marketing": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "it":        {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "rh":        {"model": _FAST, "tier": "hot", "keep_alive": "-1"},

    "analysis":  {"model": _QUALITY, "tier": "warm", "keep_alive": "20m", "max_tokens": 2048, "temperature": 0.2},
    "bi":        {"model": _QUALITY, "tier": "warm", "keep_alive": "20m", "max_tokens": 2048, "temperature": 0.2},
    "reasoning": {"model": _QUALITY, "tier": "warm", "keep_alive": "20m", "max_tokens": 2048},
    "medical":   {"model": _QUALITY, "tier": "warm", "keep_alive": "20m"},

    "vision":    {"model": _VISION, "tier": "cold", "keep_alive": "5m", "max_tokens": 1024},
    "ocr":       {"model": _OCR,    "tier": "cold", "keep_alive": "5m", "max_tokens": 1024, "temperature": 0.2},

    "nomic-embed-text": {"model": _EMBED, "tier": "hot", "keep_alive": "-1", "num_ctx": 2048, "max_tokens": 512},
}

# Adjuntos -> categoría
ROUTING_POLICY = {
    "attachment_type": {
        "image": "vision",
        "vision": "vision",
        "ocr": "ocr",
        "excel": "analysis",
        "csv": "analysis",
        "pdf": "analysis",
        "word": "analysis",
    },
}

INFERENCE_PRESETS = {
    "hot":  {"temperature": 0.4, "num_ctx": 8192, "max_tokens": 1024},
    "warm": {"temperature": 0.3, "num_ctx": 8192, "max_tokens": 1024},
    "cold": {"temperature": 0.2, "num_ctx": 4096, "max_tokens": 512},
}

DEFAULT_MODEL_KEY = "default"
ALLOWED_MODELS = list(MODEL_REGISTRY.keys())


def _build_model_config_entry(model_key: str, model_definition: dict) -> dict:
    preset_values = INFERENCE_PRESETS.get(model_definition.get("tier"), {})
    return {**preset_values, **model_definition, "key": model_key}


@lru_cache()
def get_model_config() -> dict:
    return {
        key: _build_model_config_entry(key, definition)
        for key, definition in MODEL_REGISTRY.items()
    }


def get_model_info(model_key: str) -> dict:
    models = get_model_config()
    return models.get(model_key, models[DEFAULT_MODEL_KEY])
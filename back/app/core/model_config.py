from functools import lru_cache

_FAST = "qwen2.5:7b"
_QUALITY = _FAST
_VISION = "gemma4:e4b"
_OCR = "glm-ocr"
_EMBED = "nomic-embed-text"

CPU_OPTIONS = {
    "num_thread": 6,
    "num_predict": 512,
}

MODEL_REGISTRY = {
    "default": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "code": {
        "model": _FAST,
        "tier": "hot",
        "keep_alive": "-1",
        "options": {"num_predict": 2048},
    },
    "landing": {
        "model": _FAST,
        "tier": "hot",
        "keep_alive": "-1",
        "options": {"num_predict": 2048, "temperature": 0.22},
    },
    "design": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "marketing": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "it": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "rh": {"model": _FAST, "tier": "hot", "keep_alive": "-1"},
    "analysis": {
        "model": _QUALITY,
        "tier": "warm",
        "keep_alive": "20m",
        "options": {"num_predict": 2048, "temperature": 0.18},
    },
    "bi": {
        "model": _QUALITY,
        "tier": "warm",
        "keep_alive": "20m",
        "options": {"num_predict": 2048, "temperature": 0.18},
    },
    "reasoning": {
        "model": _QUALITY,
        "tier": "warm",
        "keep_alive": "20m",
        "options": {"num_predict": 2048},
    },
    "medical": {"model": _QUALITY, "tier": "warm", "keep_alive": "20m"},
    "vision": {
        "model": _VISION,
        "tier": "cold",
        "keep_alive": "5m",
        "options": {"num_predict": 512},
    },
    "ocr": {
        "model": _OCR,
        "tier": "cold",
        "keep_alive": "5m",
        "options": {"num_predict": 512, "temperature": 0.2},
    },
    "nomic-embed-text": {
        "model": _EMBED,
        "tier": "hot",
        "keep_alive": "-1",
        "options": {"num_ctx": 2048, "num_predict": 512},
    },
}

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
    "hot": {"temperature": 0.3, "num_ctx": 2048},
    "warm": {"temperature": 0.2, "num_ctx": 2048},
    "cold": {"temperature": 0.15, "num_ctx": 2048},
}

DEFAULT_MODEL_KEY = "default"
ALLOWED_MODELS = list(MODEL_REGISTRY.keys())


def _build_model_config_entry(model_key: str, model_definition: dict) -> dict:
    tier = model_definition.get("tier")
    preset_options = INFERENCE_PRESETS.get(tier, {}).copy()
    model_options = model_definition.get("options", {})
    final_options = {**CPU_OPTIONS, **preset_options, **model_options}

    return {
        "key": model_key,
        "model": model_definition["model"],
        "tier": tier,
        "keep_alive": model_definition.get("keep_alive", "5m"),
        "options": final_options,
    }


@lru_cache()
def get_model_config() -> dict:
    return {
        key: _build_model_config_entry(key, definition)
        for key, definition in MODEL_REGISTRY.items()
    }


def get_model_info(model_key: str) -> dict:
    models = get_model_config()
    return models.get(model_key, models[DEFAULT_MODEL_KEY])

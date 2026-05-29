from functools import lru_cache

MODEL_REGISTRY = {
    "default": {
        "model": "qwen2.5:7b",
        "preset": "hot",
        "tier": "hot",
        "capabilities": ["general", "text"],
        "num_ctx": 8192,
        "max_tokens": 1024,
    },
    "nomic-embed-text": {
        "model": "nomic-embed-text",
        "preset": "hot",
        "tier": "hot",
        "capabilities": ["embedding", "semantic_search"],
        "num_ctx": 2048,
        "max_tokens": 1024,
    },
    "qwen2.5-coder": {
        "model": "qwen2.5-coder:7b",
        "preset": "warm",
        "tier": "warm",
        "capabilities": ["code", "reasoning"],
        "num_ctx": 2048,
        "max_tokens": 2048,
    },
    "gemma4-e2b": {
        "model": "gemma4-e2b:latest",
        "preset": "warm",
        "tier": "warm",
        "capabilities": ["general", "embedded"],
        "num_ctx": 1024,
        "max_tokens": 512,
    },
    "deepseek-r1": {
        "model": "deepseek-r1:latest",
        "preset": "warm",
        "tier": "warm",
        "capabilities": ["reasoning"],
        "num_ctx": 2048,
        "max_tokens": 1024,
    },
    "gemma4-e4b": {
        "model": "gemma4-e4b:latest",
        "preset": "semi-warm",
        "tier": "semi-warm",
        "capabilities": ["analysis", "general"],
        "num_ctx": 2048,
        "max_tokens": 1024,
    },
    "llama3.2-vision": {
        "model": "llama3.2-vision:11b",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["vision", "image"],
        "num_ctx": 4096,
        "max_tokens": 512,
    },
    "deepseek-ocr": {
        "model": "deepseek-ocr:latest",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["ocr", "image"],
        "num_ctx": 2048,
        "max_tokens": 512,
        "temperature": 0.2,
    },
    "glm-ocr": {
        "model": "glm-ocr",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["ocr", "text"],
        "num_ctx": 2048,
        "max_tokens": 512,
    },
    "gemma4-26b": {
        "model": "gemma4:26b",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["general", "large"],
        "num_ctx": 8192,
        "max_tokens": 2048,
    },
    "glm-4.7-flash": {
        "model": "glm-4.7-flash:latest",
        "preset": "cold",
        "tier": "cold",
        "capabilities": [""],
        "num_ctx": 2048,
        "max_tokens": 1024,
    },
    "nemotron-cascade-2": {
        "model": "nemotron-cascade-2",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["general"],
        "num_ctx": 4096,
        "max_tokens": 1024,
    },
    "qwen3.6": {
        "model": "qwen3.6",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["general", "text"],
        "num_ctx": 2048,
        "max_tokens": 1024,
    },
    "vision": {
        "model": "llama3.2-vision:11b",
        "preset": "cold",
        "tier": "cold",
        "capabilities": ["vision", "image"],
        "num_ctx": 8192,
        "max_tokens": 2048,
    },
    "analysis": {
        "model": "gemma4-e4b:latest",
        "preset": "semi-warm",
        "tier": "semi-warm",
        "capabilities": ["analysis", "tabular", "excel", "csv"],
        "num_ctx": 8192,
        "max_tokens": 2048,
        "temperature": 0.2,
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
    "hot": {"temperature": 0.4, "num_ctx": 2048, "max_tokens": 1024},
    "warm": {"temperature": 0.3, "num_ctx": 8192, "max_tokens": 1024},
    "semi-warm": {"temperature": 0.3, "num_ctx": 4096, "max_tokens": 1024},
    "cold": {"temperature": 0.2, "num_ctx": 1024, "max_tokens": 512},
}


DEFAULT_MODEL_KEY = "default"
ALLOWED_MODELS = list(MODEL_REGISTRY.keys())


def _build_model_config_entry(model_key: str, model_definition: dict) -> dict:
    preset_name = model_definition.get("preset")
    preset_values = INFERENCE_PRESETS.get(preset_name, {})
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

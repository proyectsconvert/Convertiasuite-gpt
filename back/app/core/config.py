from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    ollama_base_url: str
    default_model: str = "qwen2.5:7b"

    model_mapping: dict = {
        "default": "qwen2.5:7b",
        "code": "qwen2.5-coder:7b",
        "vision": "llama3.2-vision:11b",
        "analysis": "gemma4:26b",
        "embeddings": "nomic-embed-text",
        "gemma-small": "gemma4-e2b:latest",
        "gemma-medium": "gemma4-e4b:latest",
        "reasoning": "deepseek-r1:latest",
        "ocr": "deepseek-ocr:latest",
        "medical": "medgemma:4b"
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

@lru_cache()
def get_settings():
    return Settings()
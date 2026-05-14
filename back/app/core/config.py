from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # External Services
    ollama_base_url: str
    redis_url: str
    supabase_url: str = ""
    supabase_key: str = ""  
    supabase_service_key: str = ""  
    database_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
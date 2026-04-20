import httpx
from app.core.config import get_settings

settings = get_settings()
async def generate_response(prompt: str, model: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            return response.json().get("response", "")

    except httpx.HTTPStatusError as e:
        return f"[ERROR OLLAMA] {e.response.text}"

    except Exception as e:
        return f"[ERROR GENERAL] {str(e)}"
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def resolve_timezone(timezone_str: str):
    try:
        return ZoneInfo(timezone_str)
    except Exception:
        return timezone.utc


def build_greeting(now: datetime) -> str:
    hour = now.hour
    if 5 <= hour < 12:
        return "Buenos días, soy OlivIA. ¿En qué puedo ayudarte?"
    elif 12 <= hour < 19:
        return "Buenas tardes, soy OlivIA. ¿En qué puedo ayudarte?"
    else:
        return "Buenas noches, soy OlivIA. ¿En qué puedo ayudarte?"

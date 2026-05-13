from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def get_client_identifier(request: Request) -> str:
    ip = get_remote_address(request)
    
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return f"user:{user_id}"
    

    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    
    return f"ip:{ip}"

limiter = Limiter(key_func=get_client_identifier)
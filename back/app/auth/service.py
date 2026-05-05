import logging
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.auth.auth_config import get_auth_settings
from app.infra.clients.supabase_client import SupabaseClient
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
auth_settings = get_auth_settings()

def get_user(email: str) -> dict | None:
    supabase = SupabaseClient().get_client(admin=True)
    response = supabase.auth.admin.list_users()
    for user in response.users:
        if user.email == email:
            return {
                "id": user.id,
                "name": user.user_metadata.get("name", user.email.split("@")[0]),
                "email": user.email,
                "role": user.user_metadata.get("role", "viewer")
            }
    return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return True

def authenticate_with_supabase(email: str, password: str) -> dict | None:
    supabase = SupabaseClient().get_client()
    try:
        logger.info(f"Tentando login con Supabase: {settings.supabase_url}")
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return {
            "id": response.user.id,
            "name": response.user.user_metadata.get("name", email.split("@")[0]),
            "email": response.user.email,
            "role": response.user.user_metadata.get("role", "viewer")
        }
    except Exception as e:
        logger.error(f"Supabase auth error: {type(e).__name__}: {e}")
        return None

def create_access_token(user: dict) -> str:
    to_encode = {
        "sub": user["email"],
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=auth_settings.access_token_expire_minutes),
    }
    return jwt.encode(to_encode, auth_settings.secret_key, algorithm=auth_settings.algorithm)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, auth_settings.secret_key, algorithms=[auth_settings.algorithm])
    except JWTError:
        return None

def build_user_info(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }
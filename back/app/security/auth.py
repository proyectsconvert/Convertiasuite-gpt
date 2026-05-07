import logging
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.core.config import Settings
from app.schemas.auth import UserInfo
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)
settings = Settings()


def authenticate_with_supabase(email: str, password: str) -> dict | None:
    """Autenticar usuario contra Supabase Auth"""
    try:
        supabase = SupabaseClient().get_client(admin=False)
        logger.info(f"Intento de login: {email}")
        
        # Supabase espera auth.sign_in_with_password() pero nuestro cliente es PostgreSQL
        # Así que usamos el endpoint REST de Supabase
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        return {
            "id": response.user.id,
            "name": response.user.user_metadata.get("full_name") or response.user.user_metadata.get("name", email.split("@")[0]),
            "email": response.user.email,
            "role": response.user.user_metadata.get("role", "viewer"),
            "avatar_url": response.user.user_metadata.get("avatar_url"),
        }
    except Exception as e:
        logger.error(f"Error en autenticación Supabase: {type(e).__name__}: {e}")
        return None


def get_user(email: str) -> dict | None:
    """Obtener usuario por email desde Supabase"""
    try:
        supabase = SupabaseClient().get_client(admin=True)
        response = supabase.auth.admin.list_users()
        
        for user in response.users:
            if user.email == email:
                return {
                    "id": user.id,
                    "name": user.user_metadata.get("name", email.split("@")[0]),
                    "email": user.email,
                    "role": user.user_metadata.get("role", "viewer")
                }
        return None
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {e}")
        return None


def create_access_token(user: dict) -> str:
    """Crear token JWT para sesión"""
    to_encode = {
        "sub": user["email"],
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    """Decodificar y validar token JWT"""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        logger.debug(f"Token inválido: {token[:20]}...")
        return None


def build_user_info(user: dict) -> UserInfo:
    """Construir UserInfo desde datos de usuario"""
    return UserInfo(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"]
    )

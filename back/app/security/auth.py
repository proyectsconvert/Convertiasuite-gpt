from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import Settings
from app.schemas.auth import UserInfo

settings = Settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Temporal: usuarios hardcodeados (cambiar a Supabase luego)
fake_users_db: dict[str, dict] = {
    "admin@convertiasite.com": {
        "id": "UsrConv_001",
        "name": "Admin User Convertia",
        "email": "admin@convertiasite.com",
        "hashed_password": pwd_context.hash("adminpassword"),
        "role": "admin"
    },
    "demo@convertiasite.com": {
        "id": "UsrConv_002",
        "name": "Demo User Convertia",
        "email": "demo@convertiasite.com",
        "hashed_password": pwd_context.hash("demopassword"),
        "role": "viewer"
    },
}

def get_user(email: str) -> dict | None:
    """Obtener usuario por email (temporal - cambiar a Supabase)"""
    return fake_users_db.get(email)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña hasheada"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user: dict) -> str:
    """Crear token JWT desde datos de usuario"""
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
        return None

def build_user_info(user: dict) -> UserInfo:
    """Construir UserInfo desde datos de usuario"""
    return UserInfo(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"]
    )

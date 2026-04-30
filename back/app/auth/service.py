from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.auth.auth_config import get_auth_settings
from app.auth.schemas import UserInfo

settings = get_auth_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    return fake_users_db.get(email)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user: dict) -> str:
    to_encode = {
        "sub": user["email"],
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None

def build_user_info(user: dict) -> UserInfo:
    return UserInfo(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"]
    )
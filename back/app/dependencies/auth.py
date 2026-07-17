import logging
import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    payload = await asyncio.to_thread(auth_service.decode_token, token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth_service.get_user_from_token(payload)


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    user_role = current_user.get("role", "").lower()
    if user_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de administrador para acceder a esta sección.",
        )
    return current_user

import logging
import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth.auth_service import AuthService

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

async def require_campaign_member(current_user: dict = Depends(get_current_user)) -> dict:
    user_role = current_user.get("role", "").lower()
    if user_role != "campaign_member":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de miembro de campaña para acceder a esta sección.",
        )
    return current_user

async def require_admin_or_qa(current_user: dict = Depends(get_current_user)) -> dict:
    user_role = current_user.get("role", "").lower()
    functional_role = (current_user.get("functional_role") or "").lower()
    
    if user_role == "admin" or "qa" in functional_role or "quality" in functional_role:
        return current_user

    # Fallback to check DB if functional_role is not in JWT
    from app.infra.clients.supabase_client import SupabaseClient
    import asyncio
    
    try:
        supabase = SupabaseClient().admin
        user_id = current_user.get("id")
        
        if user_id:
            # Check employee_profiles for position_id
            emp_res = await asyncio.to_thread(
                lambda: supabase.table("employee_profiles")
                .select("position_id")
                .eq("user_id", user_id)
                .execute()
            )
            if emp_res.data and emp_res.data[0].get("position_id"):
                pos_id = emp_res.data[0]["position_id"]
                pos_res = await asyncio.to_thread(
                    lambda: supabase.table("positions")
                    .select("position_name")
                    .eq("position_id", pos_id)
                    .execute()
                )
                if pos_res.data:
                    db_functional_role = pos_res.data[0].get("position_name", "").lower()
                    if "qa" in db_functional_role or "quality" in db_functional_role:
                        current_user["functional_role"] = db_functional_role
                        return current_user
    except Exception as e:
        logger.warning(f"Error checking QA permissions in DB: {e}")
        
    raise HTTPException(
        status_code=403,
        detail="Se requieren permisos de administrador o QA para acceder a esta sección.",
    )
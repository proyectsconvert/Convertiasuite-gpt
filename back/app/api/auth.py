from fastapi import APIRouter, HTTPException, Request, status, Depends
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)
from app.security.rate_limiting import limiter
from app.services.auth_service import AuthService
from app.dependencies.auth import get_current_user

import logging

logger = logging.getLogger(__name__)
auth_service = AuthService()

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
):
    auth_data = await auth_service.authenticate(body.email, body.password)
    if not auth_data:
        logger.warning(f"Invalid login attempt: {body.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    session = auth_data["session"]
    user = auth_data["user"]

    user_metadata = user.user_metadata or {}

    app_metadata = user.app_metadata or {}

    user_data = {
        "id": user.id,
        "name": (
            user_metadata.get("full_name") or user_metadata.get("name") or "Usuario"
        ),
        "email": user.email,
        "role": (
            app_metadata.get(
                "role",
                "authenticated",
            )
        ),
        "area": user_metadata.get("area"),
        "functional_role": user_metadata.get("functional_role"),
    }

    logger.info(
        "User authenticated user_id=%s",
        user.id,
    )

    return TokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
        user=user_data,
    )


@router.put(
    "/profile",
    response_model=dict,
)
async def update_profile(
    request: Request,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado",
            )

        result = await auth_service.update_profile(
            user_id=user_id,
            name=body.get("name"),
            area=body.get("area"),
            functional_role=body.get("functional_role"),
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al actualizar el perfil",
            )

        logger.info(f"Profile updated for user: {user_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_profile: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )


@router.post(
    "/change-password",
    response_model=dict,
)
async def change_password(
    request: Request,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autenticado",
            )

        current_password = body.get("current_password")
        new_password = body.get("new_password")

        if not current_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual y nueva requeridas",
            )

        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe tener al menos 8 caracteres",
            )

        result = await auth_service.change_password(
            user_id=user_id,
            current_password=current_password,
            new_password=new_password,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual incorrecta o error al cambiar la contraseña",
            )

        logger.info(f"Password changed for user: {user_id}")
        return {"success": True, "message": "Contraseña actualizada con éxito"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in change_password: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )

 
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token requerido",
        )

    refresh_token = auth_header.replace("Bearer ", "")

    auth_data = await auth_service.refresh_token(refresh_token)

    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    session = auth_data["session"]
    user = auth_data["user"]

    user_metadata = user.user_metadata or {}
    app_metadata = user.app_metadata or {}

    return TokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
        user={
            "id": user.id,
            "name": (
                user_metadata.get("full_name")
                or user_metadata.get("name")
                or "Usuario"
            ),
            "email": user.email,
            "role": app_metadata.get("role", "authenticated"),
            "area": user_metadata.get("area"),
            "functional_role": user_metadata.get("functional_role"),
        },
    )
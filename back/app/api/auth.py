from fastapi import (APIRouter, HTTPException, Request, status,)
from app.schemas.auth import (LoginRequest, TokenResponse,)
from app.security.rate_limiting import limiter
from app.services.auth_service import AuthService

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

    user_metadata = (
        user.user_metadata or {}
    )

    app_metadata = (
        user.app_metadata or {}
    )

    user_data = {
        "id": user.id,

        "name": (
            user_metadata.get("full_name")
            or user_metadata.get("name")
            or "Usuario"
        ),

        "email": user.email,

        "role": (
            app_metadata.get(
                "role",
                "authenticated",
            )
        ),
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
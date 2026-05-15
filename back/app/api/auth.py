from fastapi import (APIRouter, HTTPException, Request, status,)
from app.schemas.auth import (LoginRequest, TokenResponse,)
from app.security.rate_limiting import limiter
from app.infra.clients.supabase_client import SupabaseClient

import logging

logger = logging.getLogger(__name__)

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

    try:

        supabase = SupabaseClient().anon

        response = (
            supabase.auth
            .sign_in_with_password(
                {
                    "email": body.email,
                    "password": body.password,
                }
            )
        )

    except Exception:

        logger.exception(
            "Supabase authentication failure"
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    if (
        not response
        or not response.user
        or not response.session
    ):

        logger.warning(
            "Invalid login attempt"
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    user_metadata = (
        response.user.user_metadata or {}
    )

    app_metadata = (
        response.user.app_metadata or {}
    )

    user_data = {
        "id": response.user.id,

        "name": (
            user_metadata.get("full_name")
            or user_metadata.get("name")
            or "Usuario"
        ),

        "email": response.user.email,

        "role": (
            app_metadata.get(
                "role",
                "authenticated",
            )
        ),
    }

    logger.info(
        "User authenticated user_id=%s",
        response.user.id,
    )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        token_type="bearer",
        expires_in=response.session.expires_in,
        user=user_data,
    )
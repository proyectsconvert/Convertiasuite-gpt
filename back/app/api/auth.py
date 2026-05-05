from fastapi import APIRouter, HTTPException, status, Request
from app.schemas.auth import LoginRequest, TokenResponse
from app.auth.service import authenticate_with_supabase, create_access_token, build_user_info
from app.security.rate_limiting import limiter
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest):
    logger.info(f"Login attempt for: {body.email}")
    user = authenticate_with_supabase(body.email, body.password)
    logger.info(f"User result: {user}")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    return TokenResponse(
        access_token=create_access_token(user),
        user=build_user_info(user),
    )
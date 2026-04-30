from fastapi import APIRouter, HTTPException, status, Request
from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.service import get_user, verify_password, create_access_token, build_user_info
from app.security.rate_limiting import limiter 

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest):
    user = get_user(body.email)

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    
    return TokenResponse(
        access_token=create_access_token(user),
        user=build_user_info(user),
    )
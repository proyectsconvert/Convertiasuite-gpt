from fastapi import (
    APIRouter,
    HTTPException,
    status,
    Request
)

from app.schemas.auth import LoginRequest

from app.security.rate_limiting import limiter

from app.infra.clients.supabase_client import (
    SupabaseClient
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    body: LoginRequest
):

    try:

        supabase = (
            SupabaseClient()
            .get_client(admin=False)
        )

        response = (
            supabase.auth
            .sign_in_with_password({
                "email": body.email,
                "password": body.password
            })
        )

        if not response.user:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )

        logger.info(
            f"Usuario autenticado "
            f"user_id={response.user.id}"
        )

        return {

            "access_token":
                response.session.access_token,

            "refresh_token":
                response.session.refresh_token,

            "user": {

                "id":
                    response.user.id,

                "name":
                    response.user.user_metadata.get(
                        "full_name"
                    )
                    or
                    response.user.user_metadata.get(
                        "name",
                        body.email.split("@")[0]
                    ),

                "email":
                    response.user.email,

                "role":
                    response.user.user_metadata.get(
                        "role",
                        "viewer"
                    )
            }
        }

    except Exception as e:

        logger.exception("Authentication error")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error en la autenticación"
        )
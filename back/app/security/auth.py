import logging
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class AuthService:

    def __init__(self):
        self.supabase = SupabaseClient().anon

    async def authenticate_with_supabase(
        self,
        email: str,
        password: str
    ) -> dict | None:

        try:
            logger.info(f"Login attempt: {email}")

            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            session = response.session
            user = response.user

            if not session or not user:
                return None

            return {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": session.expires_in,
                "token_type": "bearer",

                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": (
                        user.user_metadata.get("full_name")
                        or user.user_metadata.get("name")
                        or user.email.split("@")[0]
                    ),
                    "role": "authenticated",
                    "avatar_url": user.user_metadata.get("avatar_url"),
                }
            }

        except Exception as e:
            logger.error(
                f"Supabase authentication error: {type(e).__name__}: {e}"
            )

            return None
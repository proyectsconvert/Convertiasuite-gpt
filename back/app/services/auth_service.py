import logging
from app.infra.clients.supabase_client import SupabaseClient
logger = logging.getLogger(__name__)


class AuthService:

    def __init__(self):
        self.supabase = SupabaseClient().anon

    async def authenticate(self, email: str, password: str) -> dict | None:
        try:
            logger.info(f"Login attempt: {email}")
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            if not response or not response.user or not response.session:
                return None
            return {
                "session": response.session,
                "user": response.user
            }
        except Exception as e:
            logger.error(f"Supabase authentication error: {type(e).__name__}: {e}")
            return None

    def decode_token(
        self,
        token: str
    ) -> dict | None:

        try:

            response = (
                self.supabase.auth
                .get_user(token)
            )

            if (
                not response
                or not response.user
            ):
                return None

            user = response.user

            return {
                "sub": user.id,
                "email": user.email,
                "role": self._resolve_role(user),
            }

        except Exception as e:

            logger.warning(
                "Invalid Supabase JWT: %s",
                str(e),
            )

            return None

    def get_user_from_token(
        self,
        payload: dict
    ) -> dict:

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get(
                "role",
                "authenticated",
            ),
        }

    def _resolve_role(
        self,
        user
    ) -> str:

        app_metadata = (
            user.app_metadata or {}
        )

        return (
            app_metadata.get("role")
            or "authenticated"
        )
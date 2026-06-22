import logging
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self):
        self.supabase = SupabaseClient().anon

    async def authenticate(self, email: str, password: str) -> dict | None:
        try:
            logger.info(f"Login attempt: {email}")
            response = self.supabase.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
            if not response or not response.user or not response.session:
                return None
            return {"session": response.session, "user": response.user}
        except Exception as e:
            logger.error(f"Supabase authentication error: {type(e).__name__}: {e}")
            return None

    def decode_token(self, token: str) -> dict | None:

        try:
            response = self.supabase.auth.get_user(token)

            if not response or not response.user:
                return None

            user = response.user

            return {
                "sub": user.id,
                "email": user.email,
                "role": self._resolve_role(user),
            }

        except Exception as e:
            logger.warning(
                "Supabase token validation failed type=%s error=%s",
                type(e).__name__,
                e,
            )
            return None

    def get_user_from_token(self, payload: dict) -> dict:

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get(
                "role",
                "authenticated",
            ),
        }

    def _resolve_role(self, user) -> str:

        app_metadata = user.app_metadata or {}

        return app_metadata.get("role") or "authenticated"

    async def refresh_token(self, refresh_token: str) -> dict | None:
        try:
            logger.info("Token refresh attempt")
            response = self.supabase.auth.refresh_session(refresh_token)
            if not response or not response.user or not response.session:
                return None
            return {"session": response.session, "user": response.user}
        except Exception as e:
            logger.error(f"Supabase session refresh error: {type(e).__name__}: {e}")
            return None

    async def update_profile(
        self,
        user_id: str,
        name: str | None = None,
        area: str | None = None,
        functional_role: str | None = None,
    ) -> dict | None:
        try:
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            attributes = {}

            # Update user metadata (name, area, functional_role)
            current_user = admin_client.auth.admin.get_user_by_id(user_id)
            current_metadata = (
                current_user.user.user_metadata or {}
                if current_user and current_user.user
                else {}
            )

            new_metadata = {**current_metadata}
            if name is not None:
                new_metadata["full_name"] = name
            if area is not None:
                new_metadata["area"] = area
            if functional_role is not None:
                new_metadata["functional_role"] = functional_role

            # Only add to attributes if something changed
            if new_metadata != current_metadata:
                attributes["user_metadata"] = new_metadata

            if not attributes:
                # Still return user data even if nothing changed
                return self._format_user_response(current_user.user)

            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                attributes,
            )
            if not response or not response.user:
                return None

            return self._format_user_response(response.user)
        except Exception as e:
            logger.error(
                f"Error updating user profile user_id={user_id} error={type(e).__name__}: {e}"
            )
            return None

    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> dict | None:
        try:
            # First verify the current password by trying to sign in
            # This requires knowing the user's email
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            # Get user email
            user_response = admin_client.auth.admin.get_user_by_id(user_id)
            if not user_response or not user_response.user:
                logger.error(f"User not found: {user_id}")
                return None

            user_email = user_response.user.email

            # Try to authenticate with current password
            anon_client = SupabaseClient().anon
            try:
                auth_response = anon_client.auth.sign_in_with_password(
                    {"email": user_email, "password": current_password}
                )
                if not auth_response or not auth_response.user:
                    logger.warning(f"Invalid current password for user: {user_id}")
                    return None
            except Exception as auth_error:
                logger.warning(
                    f"Password verification failed for user {user_id}: {auth_error}"
                )
                return None

            # Update password
            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password},
            )

            if not response or not response.user:
                logger.error(f"Failed to update password for user: {user_id}")
                return None

            return {"success": True}
        except Exception as e:
            logger.error(
                f"Error changing password for user_id={user_id} error={type(e).__name__}: {e}"
            )
            return None

    def _format_user_response(self, user) -> dict:
        """Format user response with all metadata fields"""
        user_metadata = user.user_metadata or {}
        app_metadata = user.app_metadata or {}

        return {
            "id": user.id,
            "name": (
                user_metadata.get("full_name") or user_metadata.get("name") or "Usuario"
            ),
            "email": user.email,
            "role": app_metadata.get("role", "authenticated"),
            "area": user_metadata.get("area"),
            "functional_role": user_metadata.get("functional_role"),
        }

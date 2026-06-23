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

            try:
                self.sync_user_profile_to_db(response.user)
            except Exception as se:
                logger.error(f"Authentication profile sync failed: {se}")

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

            user_metadata = user.user_metadata or {}
            return {
                "sub": user.id,
                "email": user.email,
                "role": self._resolve_role(user),
                "name": user_metadata.get("full_name") or user_metadata.get("name") or user.email,
                "area": user_metadata.get("area"),
                "functional_role": user_metadata.get("functional_role"),
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
            "name": payload.get("name"),
            "area": payload.get("area"),
            "functional_role": payload.get("functional_role"),
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

    def sync_user_profile_to_db(self, user) -> None:
        try:
            from app.infra.clients.supabase_client import SupabaseClient
            admin_client = SupabaseClient().admin

            user_id = user.id
            email = user.email
            user_metadata = user.user_metadata or {}

            name = user_metadata.get("full_name") or user_metadata.get("name")
            area = user_metadata.get("area")
            functional_role = user_metadata.get("functional_role")

            # 1. Upsert profiles
            p_data = {"user_id": user_id}
            if name:
                p_data["full_name"] = name
            admin_client.table("profiles").upsert(p_data).execute()

            # 2. Resolve department_id
            dep_id = None
            if area:
                dep_res = admin_client.table("departments").select("department_id").eq("department_name", area).execute()
                if dep_res.data:
                    dep_id = dep_res.data[0]["department_id"]
                else:
                    dep_insert = admin_client.table("departments").insert({"department_name": area}).execute()
                    if dep_insert.data:
                        dep_id = dep_insert.data[0]["department_id"]

            # 3. Resolve position_id
            pos_id = None
            if functional_role:
                pos_res = admin_client.table("positions").select("position_id").eq("position_name", functional_role).execute()
                if pos_res.data:
                    pos_id = pos_res.data[0]["position_id"]
                else:
                    pos_insert = admin_client.table("positions").insert({
                        "position_name": functional_role,
                        "department_id": dep_id
                    }).execute()
                    if pos_insert.data:
                        pos_id = pos_insert.data[0]["position_id"]

            # 4. Upsert employee_profiles
            emp_data = {
                "user_id": user_id,
                "work_email": email
            }
            if dep_id is not None:
                emp_data["department_id"] = dep_id
            if pos_id is not None:
                emp_data["position_id"] = pos_id

            admin_client.table("employee_profiles").upsert(emp_data).execute()
            logger.info(f"Successfully synced user profile to database for: {email}")
        except Exception as e:
            logger.error(f"Error in sync_user_profile_to_db for user {user.id}: {e}", exc_info=True)

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
                try:
                    self.sync_user_profile_to_db(current_user.user)
                except Exception as se:
                    logger.error(f"Profile no-op sync failed: {se}")
                return self._format_user_response(current_user.user)

            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                attributes,
            )
            if not response or not response.user:
                return None

            try:
                self.sync_user_profile_to_db(response.user)
            except Exception as se:
                logger.error(f"Profile update sync failed: {se}")

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
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            user_response = admin_client.auth.admin.get_user_by_id(user_id)
            if not user_response or not user_response.user:
                logger.error(f"User not found: {user_id}")
                return None

            user_email = user_response.user.email

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
